import { describe, expect, it } from "vitest";
import { CATEGORY_IDS, GOOD_SIGN_IDS } from "@/lib/analysis/types";
import { activePreset, applyPreset, PRESETS } from "@/lib/presets";
import { DEFAULT_DISPLAY } from "@/lib/settings";

describe("presets", () => {
  it("only mark known categories", () => {
    for (const p of PRESETS) {
      for (const [id, mode] of Object.entries(p.categories)) {
        expect(CATEGORY_IDS).toContain(id);
        expect(["want", "hide"]).toContain(mode);
      }
    }
  });

  it("start from the defaults: all good signs always show", () => {
    expect(activePreset(DEFAULT_DISPLAY)?.id).toBe("default");
    expect(DEFAULT_DISPLAY.wantGood).toEqual([...GOOD_SIGN_IDS]);
  });

  it("start the rules over but keep the reader's topics", () => {
    const messy = {
      ...DEFAULT_DISPLAY,
      foldAt: 60,
      foldTropes: ["engagement_bait" as const],
      wantGood: [],
      topics: [{ label: "Rust", mode: "want" as const }],
    };
    for (const p of PRESETS) {
      const next = applyPreset(messy, p);
      expect(activePreset(next)?.id).toBe(p.id);
      expect(next.topics).toEqual(messy.topics);
    }
  });

  it("stop matching once a rule changes", () => {
    const engineer = PRESETS.find((p) => p.id === "engineer");
    if (!engineer) throw new Error("engineer preset is missing");
    const base = applyPreset(DEFAULT_DISPLAY, engineer);
    expect(
      activePreset({ ...base, categories: { ...base.categories, humor: "hide" } }),
    ).toBeUndefined();
    expect(activePreset({ ...base, foldTropes: ["hustle"] })).toBeUndefined();
    expect(activePreset({ ...base, wantGood: [] })).toBeUndefined();
  });
});
