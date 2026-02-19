import type { Patch } from "../patch/schema";
import { VitalExporter } from "../export/VitalExporter";
import { PatchJsonExporter } from "../export/PatchJsonExporter";
import { downloadBlob } from "../utils/download";
import { createDemoMidi } from "../utils/midi";

interface ExportBarProps {
  patch: Patch;
  onWarning: (warnings: string[]) => void;
}

export function ExportBar({ patch, onWarning }: ExportBarProps): JSX.Element {
  const exportVital = async () => {
    const exporter = new VitalExporter();
    const out = await exporter.export(patch);
    downloadBlob(out.filename, out.blob);
    onWarning(out.warnings);
  };

  const exportJson = async () => {
    const exporter = new PatchJsonExporter();
    const out = await exporter.export(patch);
    downloadBlob(out.filename, out.blob);
  };

  return (
    <section className="export-bar">
      <button onClick={exportVital}>Download Vital Preset</button>
      <button onClick={exportJson}>Download Patch JSON</button>
      <button onClick={() => downloadBlob("demo.mid", createDemoMidi())}>Download Demo MIDI</button>
    </section>
  );
}
