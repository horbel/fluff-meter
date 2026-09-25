import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@/lib/analysis/types";
import { activePreset, PRESETS } from "@/lib/presets";

describe("presets", () => {
  it("only mark known categories", () => {
    for (const p of PRESETS) {
      for (const [id, mode] of Object.entries(p.categories)) {
        expect(CATEGORY_IDS).toContain(id);
        expect(["want", "hide"]).toContain(mode);
      }
    }
  });

  it("recognise the preset the marks are on", () => {
    expect(activePreset({})?.id).toBe("default");
    for (const p of PRESETS) expect(activePreset({ ...p.categories })?.id).toBe(p.id);
  });

  it("stop matching once a mark changes", () => {
    const engineer = PRESETS.find((p) => p.id === "engineer");
    if (!engineer) throw new Error("engineer preset is missing");
    expect(activePreset({ ...engineer.categories, humor: "hide" })).toBeUndefined();
  });
});
