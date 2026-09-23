import { describe, expect, it } from "vitest";
import { TROPE_WEIGHTS } from "@/lib/analysis/scoring";
import { CATEGORY_IDS } from "@/lib/analysis/types";
import { activePreset, PRESETS, presetOverrides } from "@/lib/presets";

describe("presets", () => {
  it("only use known tags and weights in 0..1", () => {
    for (const p of PRESETS) {
      for (const [id, w] of Object.entries(p.tropeWeights)) {
        expect(Object.keys(TROPE_WEIGHTS)).toContain(id);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
      for (const [id, w] of Object.entries(p.categoryWeights)) {
        expect(CATEGORY_IDS).toContain(id);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it("recognise the preset the sliders are on", () => {
    expect(activePreset({ tropeWeights: {}, categoryWeights: {} })?.id).toBe("default");
    for (const p of PRESETS) expect(activePreset(presetOverrides(p))?.id).toBe(p.id);
  });

  it("stop matching once a slider moves", () => {
    const preset = PRESETS.find((p) => p.id === "engineer");
    if (!preset) throw new Error("engineer preset is missing");
    const engineer = presetOverrides(preset);
    const moved = { ...engineer, categoryWeights: { ...engineer.categoryWeights, event: 0.5 } };
    expect(activePreset(moved)).toBeUndefined();
  });
});
