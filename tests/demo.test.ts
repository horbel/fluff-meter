import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/analysis/demo";
import { CATEGORY_IDS } from "@/lib/analysis/types";

describe("demoAnalysis", () => {
  it("is labelled as demo and never names a model", () => {
    const a = demoAnalysis({ text: "Some post text that is long enough." });
    expect(a.source).toBe("demo");
    expect(a.model).toBeUndefined();
  });

  it("is stable for the same post, so scrolling back shows the same badge", () => {
    const post = { text: "Hello LinkedIn, I am thrilled to share..." };
    expect(demoAnalysis(post)).toEqual(demoAnalysis(post));
  });

  it("produces valid, varied results", () => {
    const results = Array.from({ length: 200 }, (_, i) =>
      demoAnalysis({ text: `Post number ${i}` }),
    );
    for (const r of results) {
      expect(r.index).toBeGreaterThanOrEqual(0);
      expect(r.index).toBeLessThanOrEqual(100);
      expect(CATEGORY_IDS).toContain(r.category);
    }
    const indexes = results.map((r) => r.index);
    expect(Math.max(...indexes) - Math.min(...indexes)).toBeGreaterThan(50);
  });
});
