import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/analysis/demo";
import { TROPE_IDS } from "@/lib/analysis/types";
import { DEFAULT_DISPLAY } from "@/lib/settings";
import { isEmpty, MAX_TROPES, visibleParts } from "@/lib/ui/visible";

const everything = {
  ...demoAnalysis({ text: "x" }),
  category: "stories" as const,
  tropes: [...TROPE_IDS],
  ai: { likelihood: 0.9, tells: [] },
};

describe("visibleParts", () => {
  it("shows the category and at most two clichés", () => {
    const parts = visibleParts(everything, DEFAULT_DISPLAY);
    expect(parts.index).toBe(true);
    expect(parts.category).toBe("stories");
    expect(parts.tropes).toEqual(TROPE_IDS.slice(0, MAX_TROPES));
  });

  it("skips switched-off clichés and moves the next ones up", () => {
    const parts = visibleParts(everything, {
      ...DEFAULT_DISPLAY,
      hiddenTropes: ["engagement_bait", "humblebrag"],
    });
    expect(parts.tropes).toEqual(["parable", "truism"]);
  });

  it("shows the AI chip only when the post clearly reads like AI", () => {
    expect(visibleParts(everything, DEFAULT_DISPLAY).ai).toBe(true);
    const human = { ...everything, ai: { likelihood: 0.1, tells: [] } };
    expect(visibleParts(human, DEFAULT_DISPLAY).ai).toBe(false);
    expect(visibleParts(everything, { ...DEFAULT_DISPLAY, showAi: false }).ai).toBe(false);
  });

  it("is empty when the reader switched everything off", () => {
    const parts = visibleParts(everything, {
      ...DEFAULT_DISPLAY,
      showIndex: false,
      showAi: false,
      showCategory: false,
      hiddenTropes: [...TROPE_IDS],
    });
    expect(isEmpty(parts)).toBe(true);
  });
});
