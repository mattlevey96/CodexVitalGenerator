import type { Exporter } from "./Exporter";
import type { Patch } from "../patch/schema";

export class PatchJsonExporter implements Exporter {
  async export(patch: Patch): Promise<{ filename: string; blob: Blob; warnings: string[] }> {
    const blob = new Blob([JSON.stringify(patch, null, 2)], { type: "application/json" });
    return { filename: "patch.json", blob, warnings: [] };
  }
}
