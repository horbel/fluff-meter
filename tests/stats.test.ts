import { describe, expect, it } from "vitest";
import { demoAnalysis } from "@/lib/analysis/demo";
import type { Analysis } from "@/lib/analysis/types";
import { type DailyStats, dayKey, KEEP_DAYS, recordAnalysis, summarize } from "@/lib/stats";

const post = (over: Partial<Analysis>): Analysis => ({ ...demoAnalysis({ text: "x" }), ...over });
const at = (day: string) => new Date(`${day}T12:00:00`);

const humblebrag = post({
  index: 80,
  tokens: 2000,
  category: "motivational",
  tropes: ["humblebrag", "engagement_bait"],
  ai: { likelihood: 0.9, tells: [] },
});
const tech = post({
  index: 10,
  category: "technical",
  tropes: [],
  ai: { likelihood: 0.1, tells: [] },
});

function feed(entries: [string, Analysis][]): DailyStats {
  return entries.reduce<DailyStats>((d, [day, a]) => recordAnalysis(d, a, at(day)), {});
}

describe("daily stats", () => {
  it("counts posts per local day, without any post content", () => {
    const daily = feed([
      ["2026-09-22", humblebrag],
      ["2026-09-23", tech],
      ["2026-09-23", humblebrag],
    ]);
    expect(Object.keys(daily).sort()).toEqual(["2026-09-22", "2026-09-23"]);
    expect(daily["2026-09-23"]?.posts).toBe(2);
    expect(JSON.stringify(daily)).not.toContain("text");
  });

  it("summarises a period: average, AI share and trope shares", () => {
    const daily = feed([
      ["2026-09-21", humblebrag],
      ["2026-09-23", tech],
      ["2026-09-23", humblebrag],
      ["2026-09-23", tech],
    ]);
    const week = summarize(daily, 7, at("2026-09-23"));
    expect(week.posts).toBe(4);
    expect(week.avgIndex).toBe(45);
    expect(week.aiShare).toBe(0.5);
    expect(week.tropes[0]).toEqual({ id: "humblebrag", share: 0.5 });
    expect(week.categories.map((c) => c.id).sort()).toEqual(["motivational", "technical"]);
    expect(week.categories.every((c) => c.share === 0.5)).toBe(true);

    const today = summarize(daily, 1, at("2026-09-23"));
    expect(today.posts).toBe(3);
    expect(week.tokens).toBe(4000);
    expect(week.cost).toBeCloseTo(4000 * 0.042e-6, 12);
  });

  it("compares with the period before for a trend", () => {
    const daily = feed([
      ["2026-09-22", tech],
      ["2026-09-23", humblebrag],
    ]);
    const today = summarize(daily, 1, at("2026-09-23"));
    expect(today.avgIndex).toBe(80);
    expect(today.previousAvg).toBe(10);
    expect(
      summarize(feed([["2026-09-23", tech]]), 1, at("2026-09-23")).previousAvg,
    ).toBeUndefined();
  });

  it("records the index the reader saw, not the default one", () => {
    const daily = recordAnalysis({}, tech, at("2026-09-23"), 64);
    expect(daily["2026-09-23"]?.indexSum).toBe(64);
  });

  it("forgets days older than the retention window", () => {
    const now = at("2026-09-23");
    const old = new Date(now);
    old.setDate(old.getDate() - KEEP_DAYS - 1);
    const daily = recordAnalysis(recordAnalysis({}, tech, old), tech, now);
    expect(Object.keys(daily)).toEqual([dayKey(now)]);
  });
});
