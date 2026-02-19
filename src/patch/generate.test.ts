import { describe, expect, it } from "vitest";
import { applyTweak, generatePatch } from "./generate";

describe("generatePatch", () => {
  it("is deterministic for identical inputs", () => {
    const a = generatePatch({ archetype: "Bright Lead", promptText: "wide bright lead" });
    const b = generatePatch({ archetype: "Bright Lead", promptText: "wide bright lead" });
    expect(a.meta.name).toBe(b.meta.name);
    expect(a.osc1.wavetable).toBe(b.osc1.wavetable);
    expect(a.filter.cutoffHz).toBeCloseTo(b.filter.cutoffHz);
  });
});

describe("applyTweak", () => {
  it("applies bounded focused changes", () => {
    const base = generatePatch({ archetype: "Pad", promptText: "smooth" });
    const out = applyTweak(base, "brighter and wider");
    expect(out.next.filter.cutoffHz).toBeGreaterThanOrEqual(80);
    expect(out.next.filter.cutoffHz).toBeLessThanOrEqual(16000);
    expect(Math.abs(out.next.osc1.stereoSpread - base.osc1.stereoSpread)).toBeLessThanOrEqual(0.2);
    expect(out.delta.changes.length).toBeGreaterThan(0);
  });
});
