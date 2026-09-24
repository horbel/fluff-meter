import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/analysis/demo";
import { TROPE_IDS } from "@/lib/analysis/types";
import { DEFAULT_DISPLAY } from "@/lib/settings";
import { isEmpty, MAX_LABELS, visibleParts } from "@/lib/ui/visible";

const everything = {
  ...demoAnalysis({ text: "x" }),
  category: "motivational" as const,
  tropes: [...TROPE_IDS],
};

describe("visibleParts", () => {
  it("shows everything by default, capped at five labels", () => {
    const parts = visibleParts(everything, DEFAULT_DISPLAY);
    expect(parts.index).toBe(true);
    expect(parts.category).toBe("motivational");
    expect(1 + parts.tropes.length).toBe(MAX_LABELS);
    expect(parts.tropes).toEqual(TROPE_IDS.slice(0, MAX_LABELS - 1));
  });

  it("gives the category's slot to a trope when the category is hidden", () => {
    const parts = visibleParts(everything, {
      ...DEFAULT_DISPLAY,
      hiddenCategories: ["motivational"],
    });
    expect(parts.category).toBeUndefined();
    expect(parts.tropes).toHaveLength(MAX_LABELS);
  });

  it("skips hidden tropes and moves the next ones up", () => {
    const parts = visibleParts(everything, {
      ...DEFAULT_DISPLAY,
      hiddenTropes: ["engagement_bait", "humblebrag"],
    });
    expect(parts.tropes[0]).toBe("parable");
    expect(parts.tropes).not.toContain("humblebrag");
  });

  it("is empty when the user switched everything off", () => {
    const parts = visibleParts(everything, {
      showIndex: false,
      showAi: false,
      hiddenCategories: ["motivational"],
      hiddenTropes: [...TROPE_IDS],
      tropeWeights: {},
      categoryWeights: {},
    });
    expect(isEmpty(parts)).toBe(true);
  });
});
