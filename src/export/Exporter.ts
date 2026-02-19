import type { Patch } from "../patch/schema";

export interface Exporter {
  export(patch: Patch): Promise<{ filename: string; blob: Blob; warnings: string[] }>;
}
