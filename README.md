# PatchPal MVP

PatchPal is a Vital-first habit tool for producers. It generates a playable synth patch from text and optional MP3 analysis, supports iterative tweak commands, and exports patch data with a Vital mapping stub.

## Tech

- Vite + React + TypeScript
- WebAudio client-side synth engine
- Vitest unit tests
- Static-site ready (GitHub Pages)

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Deploy (GitHub Pages)

```bash
npm run deploy
```

`vite.config.ts` uses `base: "./"` for static hosting compatibility.

## MVP Features

- Archetype selection
- Prompt-driven patch generation
- Optional MP3 upload and lightweight feature extraction (RMS, brightness proxy, attack, noisiness proxy)
- Text tweak assistant that applies bounded patch deltas
- Instrument-style UI panels (OSC/FILTER/ENV/LFO/FX)
- On-screen keyboard + computer key mapping
- Master volume and output meter
- Slide-out details panel with patch JSON, tweak diff, and audio features
- Exports:
  - `Download Vital Preset`: exports `.vital.json` stub with field mapping + warnings
  - `Download Patch JSON`
  - `Download Demo MIDI`

## Vital Export Status

The current Vital export is a **stub JSON** (`*.vital.json`), not a guaranteed importable `.vital` binary. This preserves:

- single source-of-truth patch schema
- explicit mapping to Vital concepts
- clear path to add a real `.vital` writer later in `src/export/VitalExporter.ts`

## Limitations

- Synth engine is intentionally simplified for MVP stability and musicality, not exact Vital DSP parity.
- No custom user wavetable import in v1.
- Demo WAV rendering is not implemented in this version.
