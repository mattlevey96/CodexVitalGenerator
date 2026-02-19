import type { Patch, WavetableId } from "../patch/schema";

interface PatchPanelsProps {
  patch: Patch;
  onPatch: (patch: Patch) => void;
}

function SliderRow(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label className="slider-row">
      <span>{props.label}</span>
      <input type="range" min={props.min} max={props.max} step={props.step ?? 0.001} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
      <strong>{props.value.toFixed(2)}</strong>
    </label>
  );
}

function update<T extends Patch>(patch: T, path: string, value: number | string | boolean): T {
  const next = structuredClone(patch);
  const bits = path.split(".");
  let ref: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (let i = 0; i < bits.length - 1; i += 1) ref = ref[bits[i]] as Record<string, unknown>;
  ref[bits[bits.length - 1]] = value;
  return next;
}

const WAVES: WavetableId[] = ["analog_saw", "square_pwm", "triangle_sine", "organ", "harmonic_stack", "bright_complex", "metallic"];

function OscSection({ title, prefix, patch, onPatch }: { title: string; prefix: "osc1" | "osc2"; patch: Patch; onPatch: (patch: Patch) => void }): JSX.Element {
  const osc = patch[prefix];
  return (
    <section className="panel">
      <h3>{title}</h3>
      <label className="slider-row">
        <span>Wavetable</span>
        <select value={osc.wavetable} onChange={(e) => onPatch(update(patch, `${prefix}.wavetable`, e.target.value))}>
          {WAVES.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
      </label>
      <SliderRow label="Position" value={osc.position} min={0} max={1} onChange={(v) => onPatch(update(patch, `${prefix}.position`, v))} />
      <SliderRow label="Detune" value={osc.detune} min={0} max={1} onChange={(v) => onPatch(update(patch, `${prefix}.detune`, v))} />
      <SliderRow label="Spread" value={osc.stereoSpread} min={0} max={1} onChange={(v) => onPatch(update(patch, `${prefix}.stereoSpread`, v))} />
      <SliderRow label="Level" value={osc.level} min={0} max={1} onChange={(v) => onPatch(update(patch, `${prefix}.level`, v))} />
    </section>
  );
}

export function PatchPanels({ patch, onPatch }: PatchPanelsProps): JSX.Element {
  return (
    <div className="panel-grid">
      <OscSection title="OSC1" prefix="osc1" patch={patch} onPatch={onPatch} />
      <OscSection title="OSC2" prefix="osc2" patch={patch} onPatch={onPatch} />
      <section className="panel">
        <h3>FILTER</h3>
        <label className="slider-row">
          <span>Type</span>
          <select value={patch.filter.type} onChange={(e) => onPatch(update(patch, "filter.type", e.target.value))}>
            <option value="lowpass">lowpass</option>
            <option value="bandpass">bandpass</option>
            <option value="highpass">highpass</option>
          </select>
        </label>
        <SliderRow label="Cutoff Hz" value={patch.filter.cutoffHz} min={80} max={16000} step={1} onChange={(v) => onPatch(update(patch, "filter.cutoffHz", v))} />
        <SliderRow label="Resonance" value={patch.filter.resonance} min={0} max={1} onChange={(v) => onPatch(update(patch, "filter.resonance", v))} />
        <SliderRow label="Drive" value={patch.filter.drive} min={0} max={1} onChange={(v) => onPatch(update(patch, "filter.drive", v))} />
      </section>
      <section className="panel">
        <h3>ENV</h3>
        <SliderRow label="Attack" value={patch.ampEnv.attack} min={0.001} max={3} onChange={(v) => onPatch(update(patch, "ampEnv.attack", v))} />
        <SliderRow label="Decay" value={patch.ampEnv.decay} min={0.02} max={3} onChange={(v) => onPatch(update(patch, "ampEnv.decay", v))} />
        <SliderRow label="Sustain" value={patch.ampEnv.sustain} min={0} max={1} onChange={(v) => onPatch(update(patch, "ampEnv.sustain", v))} />
        <SliderRow label="Release" value={patch.ampEnv.release} min={0.02} max={6} onChange={(v) => onPatch(update(patch, "ampEnv.release", v))} />
      </section>
      <section className="panel">
        <h3>LFO</h3>
        <SliderRow label="Rate Hz" value={patch.lfo1.rateHz} min={0.05} max={20} onChange={(v) => onPatch(update(patch, "lfo1.rateHz", v))} />
        <SliderRow label="Amount" value={patch.lfo1.amount} min={0} max={1} onChange={(v) => onPatch(update(patch, "lfo1.amount", v))} />
      </section>
      <section className="panel">
        <h3>FX</h3>
        <SliderRow label="Chorus Mix" value={patch.fx.chorus.mix} min={0} max={1} onChange={(v) => onPatch(update(patch, "fx.chorus.mix", v))} />
        <SliderRow label="Delay Mix" value={patch.fx.delay.mix} min={0} max={1} onChange={(v) => onPatch(update(patch, "fx.delay.mix", v))} />
        <SliderRow label="Reverb Mix" value={patch.fx.reverb.mix} min={0} max={1} onChange={(v) => onPatch(update(patch, "fx.reverb.mix", v))} />
      </section>
    </div>
  );
}
