import {
  type Archetype,
  type AudioFeatures,
  type Patch,
  type PatchDelta,
  type WavetableId,
  WAVE_IDS,
  clamp
} from "./schema";
import { hashString, seededRandom } from "../utils/math";

const VERSION = "0.1.0";

const WAVETABLE_BY_ARCHETYPE: Record<Archetype, WavetableId> = {
  "Deep House Pluck": "analog_saw",
  "Organ Stab": "organ",
  "Chord Stack": "harmonic_stack",
  "Reese Bass": "square_pwm",
  "Sub Bass": "triangle_sine",
  "Bright Lead": "bright_complex",
  Pad: "metallic"
};

function basePatch(archetype: Archetype): Patch {
  const now = new Date().toISOString();
  return {
    meta: {
      name: `${archetype} Init`,
      archetype,
      createdAt: now,
      version: VERSION
    },
    osc1: {
      wavetable: WAVETABLE_BY_ARCHETYPE[archetype],
      position: archetype === "Sub Bass" ? 0.15 : 0.55,
      unisonVoices: archetype === "Sub Bass" ? 1 : 3,
      detune: archetype === "Reese Bass" ? 0.42 : 0.16,
      stereoSpread: archetype === "Sub Bass" ? 0.02 : 0.45,
      level: 0.82,
      octave: archetype === "Sub Bass" ? -1 : 0,
      semitone: 0,
      fine: 0
    },
    osc2: {
      wavetable: archetype === "Organ Stab" ? "triangle_sine" : "analog_saw",
      position: 0.35,
      unisonVoices: archetype === "Sub Bass" ? 1 : 2,
      detune: archetype === "Reese Bass" ? 0.38 : 0.09,
      stereoSpread: 0.36,
      level: archetype === "Sub Bass" ? 0.2 : 0.54,
      octave: 0,
      semitone: archetype === "Chord Stack" ? 7 : 0,
      fine: 0
    },
    mixer: { osc1Level: 0.9, osc2Level: 0.65, noiseLevel: 0.02 },
    filter: {
      type: archetype === "Bright Lead" ? "bandpass" : "lowpass",
      cutoffHz: archetype === "Sub Bass" ? 160 : 2200,
      resonance: archetype === "Deep House Pluck" ? 0.28 : 0.18,
      drive: 0.22,
      keytrack: 0.45
    },
    ampEnv: {
      attack: archetype === "Pad" ? 0.08 : 0.005,
      decay: archetype === "Pad" ? 0.8 : 0.22,
      sustain: archetype === "Pad" ? 0.75 : 0.35,
      release: archetype === "Pad" ? 1.2 : 0.18
    },
    modEnv: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.0,
      release: 0.15,
      target: "filter_cutoff",
      amount: archetype === "Deep House Pluck" ? 0.34 : 0.18
    },
    lfo1: {
      shape: "sine",
      rateHz: archetype === "Pad" ? 0.16 : 4.2,
      sync: false,
      amount: archetype === "Pad" ? 0.18 : 0.08,
      target: archetype === "Pad" ? "osc1_position" : "filter_cutoff"
    },
    fx: {
      chorus: { on: archetype !== "Sub Bass", rateHz: 0.22, depth: 0.42, mix: 0.22 },
      delay: { on: archetype === "Bright Lead" || archetype === "Pad", time: 0.28, feedback: 0.3, mix: 0.21 },
      reverb: { on: archetype !== "Sub Bass", size: 0.48, damping: 0.42, mix: archetype === "Pad" ? 0.32 : 0.16 }
    },
    macros: { macro1: 0.4, macro2: 0.2, macro3: 0.1, macro4: 0.0 }
  };
}

function pickWave(rng: () => number, current: WavetableId): WavetableId {
  if (rng() < 0.75) return current;
  return WAVE_IDS[Math.floor(rng() * WAVE_IDS.length)];
}

function applyPromptHeuristics(patch: Patch, prompt: string): void {
  const text = prompt.toLowerCase();
  if (text.includes("bright")) patch.filter.cutoffHz = clamp(patch.filter.cutoffHz + 1400, 80, 16000);
  if (text.includes("dark")) patch.filter.cutoffHz = clamp(patch.filter.cutoffHz - 1000, 80, 16000);
  if (text.includes("pluck")) {
    patch.ampEnv.attack = 0.001;
    patch.ampEnv.decay = clamp(patch.ampEnv.decay - 0.08, 0.04, 2);
    patch.ampEnv.sustain = clamp(patch.ampEnv.sustain - 0.2, 0, 1);
  }
  if (text.includes("pad")) {
    patch.ampEnv.attack = clamp(patch.ampEnv.attack + 0.12, 0.001, 4);
    patch.ampEnv.release = clamp(patch.ampEnv.release + 0.8, 0.02, 6);
    patch.fx.reverb.on = true;
    patch.fx.reverb.mix = clamp(patch.fx.reverb.mix + 0.12, 0, 1);
  }
  if (text.includes("wide")) {
    patch.osc1.stereoSpread = clamp(patch.osc1.stereoSpread + 0.2, 0, 1);
    patch.osc2.stereoSpread = clamp(patch.osc2.stereoSpread + 0.2, 0, 1);
  }
  if (text.includes("detune")) {
    patch.osc1.detune = clamp(patch.osc1.detune + 0.08, 0, 1);
    patch.osc2.detune = clamp(patch.osc2.detune + 0.08, 0, 1);
  }
  if (text.includes("bass") || text.includes("sub")) {
    patch.osc1.octave = -1;
    patch.filter.cutoffHz = clamp(patch.filter.cutoffHz - 800, 60, 10000);
    patch.fx.delay.mix = clamp(patch.fx.delay.mix - 0.1, 0, 1);
  }
}

function applyAudioFeatures(patch: Patch, features?: AudioFeatures): void {
  if (!features) return;
  if (typeof features.spectralCentroid === "number") {
    const n = clamp(features.spectralCentroid / 6000, 0, 1);
    patch.filter.cutoffHz = clamp(200 + n * 9000, 80, 16000);
  }
  if (typeof features.attackTime === "number") {
    patch.ampEnv.attack = clamp(features.attackTime, 0.001, 1.5);
  }
  if (typeof features.noisiness === "number") {
    patch.mixer.noiseLevel = clamp(features.noisiness * 0.22, 0, 0.5);
  }
  if (typeof features.rms === "number") {
    patch.filter.drive = clamp(features.rms * 2, 0, 1);
  }
}

function buildDelta(prev: Patch, next: Patch): PatchDelta {
  const changes: PatchDelta["changes"] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
      if (a !== b) changes.push({ path, from: a as never, to: b as never });
      return;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.forEach((k) => walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k));
  };
  walk(prev, next, "");
  return { changes };
}

export function generatePatch(args: {
  promptText?: string;
  archetype: Archetype;
  features?: AudioFeatures;
}): Patch {
  const promptText = args.promptText?.trim() ?? "";
  const patch = basePatch(args.archetype);
  const seed = hashString(`${args.archetype}|${promptText}|${JSON.stringify(args.features ?? {})}`);
  const rng = seededRandom(seed);

  patch.osc1.wavetable = pickWave(rng, patch.osc1.wavetable);
  patch.osc2.wavetable = pickWave(rng, patch.osc2.wavetable);
  patch.osc1.position = clamp(patch.osc1.position + (rng() - 0.5) * 0.18, 0, 1);
  patch.osc2.position = clamp(patch.osc2.position + (rng() - 0.5) * 0.18, 0, 1);
  patch.filter.resonance = clamp(patch.filter.resonance + (rng() - 0.5) * 0.1, 0, 1);
  patch.lfo1.rateHz = clamp(patch.lfo1.rateHz + (rng() - 0.5) * 0.8, 0.05, 20);
  patch.meta.name = `${args.archetype} ${Math.floor(rng() * 900 + 100)}`;

  if (promptText) applyPromptHeuristics(patch, promptText);
  applyAudioFeatures(patch, args.features);
  return patch;
}

function tweakStep(text: string, includes: string[], amount = 0.08): number {
  return includes.some((k) => text.includes(k)) ? amount : 0;
}

export function applyTweak(patch: Patch, tweakText: string): { next: Patch; delta: PatchDelta; explanation: string } {
  const prev = structuredClone(patch);
  const next = structuredClone(patch);
  const text = tweakText.toLowerCase();
  let explanation = "Applied a focused tweak.";

  if (!text.trim()) {
    return { next, delta: { changes: [] }, explanation: "No tweak text provided." };
  }

  const bright = tweakStep(text, ["brighter", "bright"]);
  const dark = tweakStep(text, ["darker", "dark"]);
  const pluck = tweakStep(text, ["pluck", "snappy"], 0.12);
  const wider = tweakStep(text, ["wider", "wide"], 0.12);
  const lessDetune = tweakStep(text, ["less detune", "tighter"], 0.1);
  const movement = tweakStep(text, ["movement", "animated", "motion"], 0.1);

  if (bright) {
    next.filter.cutoffHz = clamp(next.filter.cutoffHz + 1200 * bright, 80, 16000);
    explanation = "Raised filter cutoff for a brighter tone.";
  }
  if (dark) {
    next.filter.cutoffHz = clamp(next.filter.cutoffHz - 1000 * dark, 80, 16000);
    explanation = "Lowered filter cutoff for a darker tone.";
  }
  if (pluck) {
    next.ampEnv.attack = clamp(next.ampEnv.attack - 0.01 * pluck, 0.001, 2);
    next.ampEnv.decay = clamp(next.ampEnv.decay - 0.1 * pluck, 0.03, 3);
    next.ampEnv.sustain = clamp(next.ampEnv.sustain - 0.25 * pluck, 0, 1);
    explanation = "Tightened the amp envelope for more pluck.";
  }
  if (wider) {
    next.osc1.stereoSpread = clamp(next.osc1.stereoSpread + wider, 0, 1);
    next.osc2.stereoSpread = clamp(next.osc2.stereoSpread + wider, 0, 1);
    next.fx.chorus.on = true;
    next.fx.chorus.mix = clamp(next.fx.chorus.mix + 0.08, 0, 1);
    explanation = "Increased stereo spread and chorus width.";
  }
  if (lessDetune) {
    next.osc1.detune = clamp(next.osc1.detune - lessDetune, 0, 1);
    next.osc2.detune = clamp(next.osc2.detune - lessDetune, 0, 1);
    explanation = "Reduced detune for a tighter pitch center.";
  }
  if (movement) {
    next.lfo1.amount = clamp(next.lfo1.amount + movement, 0, 1);
    next.lfo1.rateHz = clamp(next.lfo1.rateHz + 1.2, 0.05, 20);
    next.lfo1.target = "filter_cutoff";
    explanation = "Added more movement with stronger LFO modulation.";
  }
  if (text.includes("more reverb")) {
    next.fx.reverb.on = true;
    next.fx.reverb.mix = clamp(next.fx.reverb.mix + 0.12, 0, 1);
  }
  if (text.includes("less reverb")) {
    next.fx.reverb.mix = clamp(next.fx.reverb.mix - 0.12, 0, 1);
  }
  if (text.includes("less delay")) next.fx.delay.mix = clamp(next.fx.delay.mix - 0.1, 0, 1);
  if (text.includes("more delay")) {
    next.fx.delay.on = true;
    next.fx.delay.mix = clamp(next.fx.delay.mix + 0.1, 0, 1);
  }
  if (text.includes("cleaner")) next.filter.drive = clamp(next.filter.drive - 0.08, 0, 1);
  if (text.includes("grittier") || text.includes("dirtier")) next.filter.drive = clamp(next.filter.drive + 0.08, 0, 1);

  const delta = buildDelta(prev, next);
  return { next, delta, explanation };
}
