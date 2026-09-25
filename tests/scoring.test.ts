import { describe, expect, it } from "vitest";
import { textStats } from "@/lib/analysis/heuristics";
import { VERDICTS, verdictFor } from "@/lib/analysis/labels";
import { buildAnalysis, detectTropes, fluffIndex } from "@/lib/analysis/scoring";
import { SIGNAL_IDS, type Signals } from "@/lib/analysis/types";

const all = (value: number) => Object.fromEntries(SIGNAL_IDS.map((id) => [id, value])) as Signals;

describe("fluffIndex", () => {
  it("spans 0..100", () => {
    expect(fluffIndex(all(0))).toBe(0);
    expect(fluffIndex(all(1))).toBeGreaterThanOrEqual(95);
    expect(fluffIndex(all(1))).toBeLessThanOrEqual(100);
  });

  it("goes up with every signal", () => {
    for (const id of SIGNAL_IDS) {
      expect(fluffIndex({ ...all(0.3), [id]: 0.9 })).toBeGreaterThan(fluffIndex(all(0.3)));
    }
  });

  it("ignores faint maybes, so a clean post stays clean", () => {
    const noisy = { ...all(0.1), buzzwords: 0, fluff: 0, self_promotion: 0 };
    expect(fluffIndex(noisy)).toBe(0);
  });

  it("lets several strong tropes push a post near the top", () => {
    const cliche = {
      ...all(0),
      buzzwords: 0.4,
      fluff: 0.6,
      self_promotion: 0.8,
      engagement_bait: 1,
      humblebrag: 1,
      parable: 1,
      truism: 1,
    };
    expect(fluffIndex(cliche)).toBeGreaterThanOrEqual(85);
  });

  it("leaves switched-off clichés out entirely", () => {
    const bait = { ...all(0), buzzwords: 0.3, fluff: 0.3, engagement_bait: 1, ai: 1 };
    expect(fluffIndex(bait, new Set(["engagement_bait", "ai"]))).toBe(
      fluffIndex({ ...all(0), buzzwords: 0.3, fluff: 0.3 }),
    );
    expect(fluffIndex(bait, new Set(["engagement_bait"]))).toBeLessThan(fluffIndex(bait));
  });

  it("clamps out-of-range and non-finite values instead of trusting them", () => {
    expect(fluffIndex({ ...all(0), buzzwords: 7, fluff: Number.NaN })).toBe(
      fluffIndex({ ...all(0), buzzwords: 1 }),
    );
    expect(fluffIndex(all(-3))).toBe(0);
  });
});

describe("detectTropes", () => {
  const plain = textStats("A normal paragraph of text.");

  it("shows tropes above the threshold, strongest first", () => {
    const tropes = detectTropes({ ...all(0), humblebrag: 0.7, engagement_bait: 0.95 }, plain);
    expect(tropes).toEqual(["engagement_bait", "humblebrag"]);
  });

  it("detects broetry from formatting alone", () => {
    const broetry = textStats(Array.from({ length: 14 }, (_, i) => `Line ${i}.`).join("\n\n"));
    expect(detectTropes(all(0), broetry)).toEqual(["broetry"]);
  });
});

describe("verdicts", () => {
  it("covers every index with the matching tier", () => {
    expect(verdictFor(0).label).toBe("Solid");
    expect(verdictFor(100).label).toBe("Pure fluff");
    for (let i = 0; i <= 100; i++) expect(VERDICTS).toContain(verdictFor(i));
  });

  it("keeps labels short enough for one row", () => {
    for (const v of VERDICTS) expect(v.label.length).toBeLessThanOrEqual(16);
  });
});

describe("buildAnalysis", () => {
  it("keeps signals in 0..1 and stamps the rubric version", () => {
    const analysis = buildAnalysis({
      signals: { ...all(0.2), buzzwords: 3 },
      ai: { likelihood: 0.7, tells: ["dashes"] },
      stats: textStats("text"),
      category: "know_how",
      categoryConfidence: 2,
      sensitive: 0.9,
      topics: { Rust: 1.4 },
      source: "jev",
      model: "jev-1.13.0",
    });
    expect(analysis.signals.buzzwords).toBe(1);
    expect(analysis.categoryConfidence).toBe(1);
    expect(analysis.rubricVersion).toBeGreaterThan(0);
    expect(analysis.model).toBe("jev-1.13.0");
    expect(analysis.signals.ai).toBe(0.7);
    expect(analysis.ai.tells).toEqual(["dashes"]);
    expect(analysis.sensitive).toBe(true);
    expect(analysis.topics).toEqual({ Rust: 1 });
  });
});
