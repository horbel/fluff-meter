import { describe, expect, it } from "vitest";
import { broetry, formattingSignal, textStats } from "@/lib/analysis/heuristics";

describe("textStats", () => {
  it("counts emojis, hashtags and paragraphs exactly", () => {
    const s = textStats("Big news 🚀🔥\n\nWe did it 🙌\n\n#startup #ai #growth");
    expect(s.emojis).toBe(3);
    expect(s.hashtags).toBe(3);
    expect(s.paragraphs).toBe(3);
  });

  it("does not mistake '#1' inside a word for a hashtag wall", () => {
    expect(textStats("C# and F# are languages").hashtags).toBe(0);
  });
});

describe("broetry and formatting", () => {
  const prose =
    "We migrated our billing service from a monolith to three services over six months. The hardest part was the data model, not the code. Here is what we learned about idempotency keys and retries.";

  it("is zero for normal prose", () => {
    expect(broetry(textStats(prose))).toBe(0);
    expect(formattingSignal(textStats(prose))).toBe(0);
  });

  it("is high for one-liners separated by blank lines", () => {
    const lines = Array.from({ length: 16 }, () => "I failed.").join("\n\n");
    expect(broetry(textStats(lines))).toBeGreaterThan(0.9);
  });
});
