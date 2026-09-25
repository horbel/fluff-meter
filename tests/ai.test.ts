import { describe, expect, it } from "vitest";
import { aiVerdict, typography, typographyTells } from "@/lib/analysis/ai";
import { aiLabel } from "@/lib/analysis/labels";

const quiet = {
  overall: 0,
  ai_words: 0,
  not_x_but_y: 0,
  triads: 0,
  fragments: 0,
  fake_candor: 0,
  human_details: 0,
};

describe("typography", () => {
  it("measures what the model can't count", () => {
    const t = typography("𝗕𝗶𝗴 𝗻𝗲𝘄𝘀\n🚀 One\n✅ Two\n👉 Three → four ↳ five — and more — really");
    expect(t.fancyChars).toBe(7);
    expect(t.emojiBullets).toBe(3);
    expect(t.arrows).toBe(3);
    expect(t.dashesPer1k).toBeGreaterThan(0);
  });

  it("counts em dashes strongly, but not hyphens or number ranges", () => {
    const tell = (text: string) => typographyTells(typography(text)).dashes;
    expect(tell("Long-term, well-known, data-driven. From 2019–2021.")).toBe(0);
    expect(tell("This matters — a lot.")).toBe(0.5);
    expect(tell("This matters — a lot. And this—too.")).toBe(1);
  });
});

describe("aiVerdict", () => {
  it("stays low when nothing fires", () => {
    const v = aiVerdict(quiet, "plain text");
    expect(v.likelihood).toBe(0);
    expect(v.tells).toEqual([]);
  });

  it("adds up several tells, strongest first", () => {
    const v = aiVerdict({ ...quiet, overall: 1, ai_words: 0.9, not_x_but_y: 0.95 }, "text");
    expect(v.likelihood).toBeGreaterThan(0.75);
    expect(v.tells).toEqual(["not_x_but_y", "ai_words"]);
  });

  it("gives human details the benefit of the doubt", () => {
    const tells = { ...quiet, overall: 0.7, ai_words: 0.8 };
    const human = aiVerdict({ ...tells, human_details: 1 }, "text").likelihood;
    expect(human).toBeLessThan(aiVerdict(tells, "text").likelihood * 0.7);
  });
});

describe("aiLabel", () => {
  it("says it in words and keeps the number for the tooltip", () => {
    expect(aiLabel(0.1).label).toBe("Human");
    expect(aiLabel(0.5).label).toBe("Maybe AI");
    expect(aiLabel(0.82)).toMatchObject({ label: "Reads like AI", percent: "82%", level: "ai" });
  });
});
