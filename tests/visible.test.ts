import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/analysis/demo";
import { GOOD_SIGN_IDS, TROPE_IDS } from "@/lib/analysis/types";
import { DEFAULT_DISPLAY } from "@/lib/settings";
import { isEmpty, MAX_CHIPS, visibleParts } from "@/lib/ui/visible";

const demo = demoAnalysis({ text: "x" });
const everything = {
  ...demo,
  category: "stories" as const,
  tropes: [...TROPE_IDS],
  ai: { likelihood: 0.9, tells: [] },
  good: { insight: 0.95, real_take: 0.8, owns_mistake: 0.7 },
};

describe("visibleParts", () => {
  it("shows the category, at most two clichés plus the AI chip, and two good signs", () => {
    const parts = visibleParts(everything, DEFAULT_DISPLAY);
    expect(parts.index).toBe(true);
    expect(parts.category).toBe("stories");
    expect(parts.cliches).toEqual([...TROPE_IDS.slice(0, MAX_CHIPS), "ai"]);
    expect(parts.good).toEqual(GOOD_SIGN_IDS.slice(0, MAX_CHIPS));
  });

  it("shows the AI chip only when the post clearly reads like AI", () => {
    const human = { ...everything, ai: { likelihood: 0.1, tells: [] } };
    expect(visibleParts(human, DEFAULT_DISPLAY).cliches).not.toContain("ai");
  });

  it("is empty when the reader switched everything off", () => {
    const parts = visibleParts(everything, {
      ...DEFAULT_DISPLAY,
      showIndex: false,
      showCliches: false,
      showGood: false,
      showCategory: false,
    });
    expect(isEmpty(parts)).toBe(true);
  });
});
