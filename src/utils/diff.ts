import type { PatchDelta } from "../patch/schema";

export function prettyDelta(delta: PatchDelta): string {
  if (!delta.changes.length) return "No parameter changes.";
  return delta.changes
    .slice(0, 32)
    .map((c) => `${c.path}: ${String(c.from)} -> ${String(c.to)}`)
    .join("\n");
}
