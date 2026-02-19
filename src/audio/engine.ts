import type { Osc, Patch, WavetableId } from "../patch/schema";
import { clamp } from "../patch/schema";
import { midiToHz } from "../utils/math";

type Voice = {
  midi: number;
  amp: GainNode;
  filter: BiquadFilterNode;
  drive: WaveShaperNode;
  stops: (() => void)[];
};

const TABLE_STEPS = 8;

class PatchPalEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private chorusDelay: DelayNode | null = null;
  private chorusMix: GainNode | null = null;
  private dryMix: GainNode | null = null;
  private wetMix: GainNode | null = null;
  private patch: Patch | null = null;
  private voices = new Map<number, Voice>();
  private waveCache = new Map<string, PeriodicWave>();

  async initAudio(): Promise<void> {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    const ctx = this.ctx;

    const input = ctx.createGain();
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;

    this.dryMix = ctx.createGain();
    this.wetMix = ctx.createGain();
    this.dryMix.gain.value = 1;
    this.wetMix.gain.value = 0;

    this.delay = ctx.createDelay(1.0);
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.25;
    const delayMix = ctx.createGain();
    delayMix.gain.value = 0.2;
    input.connect(this.delay);
    this.delay.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delay);
    this.delay.connect(delayMix);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(ctx, 1.6);
    const reverbMix = ctx.createGain();
    reverbMix.gain.value = 0.15;
    input.connect(this.reverb);
    this.reverb.connect(reverbMix);

    this.chorusDelay = ctx.createDelay(0.05);
    this.chorusDelay.delayTime.value = 0.015;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = "sine";
    chorusLfo.frequency.value = 0.2;
    const chorusDepth = ctx.createGain();
    chorusDepth.gain.value = 0.003;
    chorusLfo.connect(chorusDepth);
    chorusDepth.connect(this.chorusDelay.delayTime);
    chorusLfo.start();
    this.chorusMix = ctx.createGain();
    this.chorusMix.gain.value = 0.2;
    input.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusMix);

    input.connect(this.dryMix);
    delayMix.connect(this.wetMix);
    reverbMix.connect(this.wetMix);
    this.chorusMix.connect(this.wetMix);

    this.dryMix.connect(this.master);
    this.wetMix.connect(this.master);
    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.inputNode = input;
  }

  private inputNode: GainNode | null = null;

  setMasterVolume(v: number): void {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(clamp(v, 0, 1.2), now + 0.03);
  }

  setPatch(patch: Patch): void {
    this.patch = patch;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.delay) this.delay.delayTime.linearRampToValueAtTime(clamp(patch.fx.delay.time, 0.05, 1), now + 0.05);
    if (this.delayFeedback) this.delayFeedback.gain.linearRampToValueAtTime(clamp(patch.fx.delay.feedback, 0, 0.9), now + 0.05);
    if (this.wetMix) {
      const wet = (patch.fx.delay.on ? patch.fx.delay.mix : 0) + (patch.fx.reverb.on ? patch.fx.reverb.mix : 0) + (patch.fx.chorus.on ? patch.fx.chorus.mix : 0);
      this.wetMix.gain.linearRampToValueAtTime(clamp(wet * 0.5, 0, 1), now + 0.05);
    }
    if (this.dryMix) this.dryMix.gain.linearRampToValueAtTime(clamp(1 - (this.wetMix?.gain.value ?? 0) * 0.35, 0.3, 1), now + 0.05);
  }

  noteOn(midiNote: number, velocity: number, patch: Patch): void {
    if (!this.ctx || !this.inputNode) return;
    this.setPatch(patch);
    if (this.voices.has(midiNote)) this.noteOff(midiNote);

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const freq = midiToHz(midiNote);
    const amp = ctx.createGain();
    amp.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = patch.filter.type;
    filter.frequency.value = patch.filter.cutoffHz;
    filter.Q.value = 0.2 + patch.filter.resonance * 16;
    const drive = ctx.createWaveShaper();
    drive.curve = this.makeDriveCurve(1 + patch.filter.drive * 8);
    drive.oversample = "2x";

    amp.connect(filter);
    filter.connect(drive);
    drive.connect(this.inputNode);

    const stops: (() => void)[] = [];
    this.buildOscStack(ctx, freq, patch.osc1, patch.mixer.osc1Level, velocity, amp, stops);
    this.buildOscStack(ctx, freq, patch.osc2, patch.mixer.osc2Level, velocity, amp, stops);
    if (patch.mixer.noiseLevel > 0.001) this.buildNoise(ctx, patch.mixer.noiseLevel * velocity, amp, stops);

    if (patch.lfo1.target === "filter_cutoff" && patch.lfo1.amount > 0.001) {
      const lfo = ctx.createOscillator();
      lfo.type = patch.lfo1.shape;
      lfo.frequency.value = patch.lfo1.rateHz;
      const mod = ctx.createGain();
      mod.gain.value = patch.lfo1.amount * 1800;
      lfo.connect(mod);
      mod.connect(filter.frequency);
      lfo.start(now);
      stops.push(() => lfo.stop(ctx.currentTime + 0.02));
    }

    const env = patch.ampEnv;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(velocity, now + env.attack);
    amp.gain.linearRampToValueAtTime(Math.max(0.0001, env.sustain * velocity), now + env.attack + env.decay);
    this.voices.set(midiNote, { midi: midiNote, amp, filter, drive, stops });
  }

  noteOff(midiNote: number): void {
    if (!this.ctx || !this.patch) return;
    const voice = this.voices.get(midiNote);
    if (!voice) return;
    const now = this.ctx.currentTime;
    const r = clamp(this.patch.ampEnv.release, 0.02, 6);
    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setTargetAtTime(0.0001, now, r / 3);
    setTimeout(() => {
      voice.stops.forEach((s) => s());
      voice.amp.disconnect();
      voice.filter.disconnect();
      voice.drive.disconnect();
    }, (r + 0.08) * 1000);
    this.voices.delete(midiNote);
  }

  getOutputLevel(): number {
    if (!this.analyser) return 0;
    const arr = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(arr);
    let sumSq = 0;
    for (let i = 0; i < arr.length; i += 1) {
      const v = (arr[i] - 128) / 128;
      sumSq += v * v;
    }
    return Math.sqrt(sumSq / arr.length);
  }

  renderDemoMidi(): Blob {
    const bytes = new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96, 77, 84, 114, 107, 0, 0, 0, 4, 0, 255, 47, 0]);
    return new Blob([bytes], { type: "audio/midi" });
  }

  async renderDemoWav(_patch: Patch): Promise<Blob> {
    throw new Error("Demo WAV render is not implemented in this MVP.");
  }

  private buildOscStack(
    ctx: AudioContext,
    baseFreq: number,
    osc: Osc,
    mixLevel: number,
    velocity: number,
    output: GainNode,
    stops: (() => void)[]
  ): void {
    const voices = osc.unisonVoices;
    for (let i = 0; i < voices; i += 1) {
      const spread = voices === 1 ? 0 : i / (voices - 1) - 0.5;
      const detuneCents = spread * osc.detune * 52;
      const panner = ctx.createStereoPanner();
      panner.pan.value = spread * osc.stereoSpread;
      const gain = ctx.createGain();
      gain.gain.value = (osc.level * mixLevel * velocity) / Math.max(1, voices);

      const [idxA, idxB, blend] = this.positionIndices(osc.position);
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      a.setPeriodicWave(this.getPeriodicWave(ctx, osc.wavetable, idxA));
      b.setPeriodicWave(this.getPeriodicWave(ctx, osc.wavetable, idxB));

      const baseDet = osc.fine + osc.semitone * 100 + osc.octave * 1200 + detuneCents;
      const freq = baseFreq;
      a.frequency.value = freq;
      b.frequency.value = freq;
      a.detune.value = baseDet;
      b.detune.value = baseDet;

      const ga = ctx.createGain();
      const gb = ctx.createGain();
      ga.gain.value = 1 - blend;
      gb.gain.value = blend;

      a.connect(ga);
      b.connect(gb);
      ga.connect(gain);
      gb.connect(gain);
      gain.connect(panner);
      panner.connect(output);

      a.start();
      b.start();
      stops.push(() => {
        a.stop(ctx.currentTime + 0.02);
        b.stop(ctx.currentTime + 0.02);
      });
    }
  }

  private buildNoise(ctx: AudioContext, level: number, out: GainNode, stops: (() => void)[]): void {
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.35;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(g);
    g.connect(out);
    src.start();
    stops.push(() => src.stop(ctx.currentTime + 0.02));
  }

  private positionIndices(position: number): [number, number, number] {
    const x = clamp(position, 0, 1) * (TABLE_STEPS - 1);
    const a = Math.floor(x);
    const b = Math.min(TABLE_STEPS - 1, a + 1);
    return [a, b, x - a];
  }

  private getPeriodicWave(ctx: AudioContext, id: WavetableId, step: number): PeriodicWave {
    const key = `${id}:${step}`;
    const cached = this.waveCache.get(key);
    if (cached) return cached;

    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    const morph = step / (TABLE_STEPS - 1);

    for (let n = 1; n < harmonics; n += 1) {
      let amp = 0;
      switch (id) {
        case "analog_saw":
          amp = 1 / n;
          break;
        case "square_pwm":
          amp = n % 2 === 1 ? 1 / n : 0;
          amp *= 1 - morph * 0.55;
          break;
        case "triangle_sine":
          amp = n % 2 === 1 ? 1 / (n * n) : 0;
          amp *= 1 - morph;
          break;
        case "organ":
          amp = n === 1 ? 1 : n === 2 ? 0.35 : n === 3 ? 0.28 : n % 2 === 0 ? 0.1 : 0.04;
          break;
        case "harmonic_stack":
          amp = n <= 8 ? 1 / Math.sqrt(n) : 0.12 / n;
          break;
        case "bright_complex":
          amp = (1 / n) * (0.6 + morph * 0.8) * (n % 3 === 0 ? 1.2 : 1);
          break;
        case "metallic":
          amp = (n % 2 === 0 ? 0.8 : 0.35) * (1 / Math.sqrt(n));
          amp *= 0.4 + morph * 0.8;
          break;
      }
      imag[n] = amp;
    }
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    this.waveCache.set(key, wave);
    return wave;
  }

  private makeDriveCurve(amount: number): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i += 1) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount);
    }
    return curve;
  }

  private createImpulseResponse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i += 1) {
        const t = 1 - i / len;
        data[i] = (Math.random() * 2 - 1) * t * t;
      }
    }
    return buffer;
  }
}

export const audioEngine = new PatchPalEngine();
