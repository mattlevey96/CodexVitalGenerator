export type Archetype =
  | "Deep House Pluck"
  | "Organ Stab"
  | "Chord Stack"
  | "Reese Bass"
  | "Sub Bass"
  | "Bright Lead"
  | "Pad";

export type WavetableId =
  | "analog_saw"
  | "square_pwm"
  | "triangle_sine"
  | "organ"
  | "harmonic_stack"
  | "bright_complex"
  | "metallic";

export type ModTarget =
  | "filter_cutoff"
  | "osc1_position"
  | "osc2_position"
  | "amp_gain"
  | "fx_chorus_mix"
  | "fx_delay_mix";

export type FilterType = "lowpass" | "bandpass" | "highpass";
export type LfoShape = "sine" | "triangle" | "saw" | "square";

export interface Osc {
  wavetable: WavetableId;
  position: number;
  unisonVoices: number;
  detune: number;
  stereoSpread: number;
  level: number;
  octave: -2 | -1 | 0 | 1 | 2;
  semitone: number;
  fine: number;
}

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface ModEnvelope extends Envelope {
  target?: ModTarget;
  amount?: number;
}

export interface Lfo {
  shape: LfoShape;
  rateHz: number;
  sync?: boolean;
  amount: number;
  target?: ModTarget;
}

export interface Patch {
  meta: {
    name: string;
    archetype: Archetype;
    createdAt: string;
    version: string;
  };
  osc1: Osc;
  osc2: Osc;
  mixer: {
    osc1Level: number;
    osc2Level: number;
    noiseLevel: number;
  };
  filter: {
    type: FilterType;
    cutoffHz: number;
    resonance: number;
    drive: number;
    keytrack: number;
  };
  ampEnv: Envelope;
  modEnv: ModEnvelope;
  lfo1: Lfo;
  fx: {
    chorus: {
      on: boolean;
      rateHz: number;
      depth: number;
      mix: number;
    };
    delay: {
      on: boolean;
      time: number;
      feedback: number;
      mix: number;
    };
    reverb: {
      on: boolean;
      size: number;
      damping: number;
      mix: number;
    };
  };
  macros?: {
    macro1: number;
    macro2: number;
    macro3: number;
    macro4: number;
  };
}

export interface AudioFeatures {
  rms?: number;
  spectralCentroid?: number;
  attackTime?: number;
  noisiness?: number;
}

export interface PatchChange {
  path: string;
  from: number | string | boolean | undefined;
  to: number | string | boolean | undefined;
}

export interface PatchDelta {
  changes: PatchChange[];
}

export const ARCHETYPES: Archetype[] = [
  "Deep House Pluck",
  "Organ Stab",
  "Chord Stack",
  "Reese Bass",
  "Sub Bass",
  "Bright Lead",
  "Pad"
];

export const WAVE_IDS: WavetableId[] = [
  "analog_saw",
  "square_pwm",
  "triangle_sine",
  "organ",
  "harmonic_stack",
  "bright_complex",
  "metallic"
];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
