import type { Exporter } from "./Exporter";
import type { Patch } from "../patch/schema";

const mapping = {
  osc1: "Oscillator 1 wavetable and tuning",
  osc2: "Oscillator 2 wavetable and tuning",
  filter: "Filter block (cutoff/resonance/drive)",
  ampEnv: "Main amp envelope",
  modEnv: "Mod envelope routing",
  lfo1: "LFO 1 routing and amount",
  fx: "FX rack (chorus/delay/reverb)",
  mixer: "Oscillator level mix"
};

export class VitalExporter implements Exporter {
  async export(patch: Patch): Promise<{ filename: string; blob: Blob; warnings: string[] }> {
    const payload = {
      format: "patchpal.vital_stub",
      message: "This is not yet a direct Vital-importable .vital binary. It is a structured stub for mapping.",
      mapping,
      patch
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    return {
      filename: `${safeName(patch.meta.name)}.vital.json`,
      blob,
      warnings: [
        "Vital export is currently a stub JSON, not a guaranteed importable .vital file.",
        "Use the patch JSON and mapping section to recreate in Vital until binary export is implemented."
      ]
    };
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-z0-9_\- ]/gi, "").trim().replace(/\s+/g, "_") || "patch";
}
