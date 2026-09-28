import { describe, expect, it } from "vitest";
import { textStats } from "@/lib/analysis/heuristics";
import { buildAnalysis } from "@/lib/analysis/scoring";
import { SIGNAL_IDS, type Signals } from "@/lib/analysis/types";
import { personalView } from "@/lib/personal";
import { DEFAULT_DISPLAY, type DisplayPrefs, normalizeDisplay } from "@/lib/settings";

const all = (value: number) => Object.fromEntries(SIGNAL_IDS.map((id) => [id, value])) as Signals;

function post(
  over: { signals?: Partial<Signals>; sensitive?: number; topics?: Record<string, number> } = {},
) {
  return buildAnalysis({
    signals: { ...all(0), buzzwords: 0.2, fluff: 0.2, ...over.signals },
    ai: { likelihood: over.signals?.ai ?? 0, tells: [] },
    stats: textStats("text"),
    category: "promo",
    categoryConfidence: 1,
    sensitive: over.sensitive ?? 0,
    topics: over.topics ?? {},
    source: "jev",
  });
}

const cliche = post({
  signals: {
    buzzwords: 1,
    fluff: 1,
    engagement_bait: 1,
    humblebrag: 1,
    parable: 1,
  },
});
const prefs = (over: Partial<DisplayPrefs> = {}): DisplayPrefs => ({ ...DEFAULT_DISPLAY, ...over });

describe("personalView", () => {
  it("folds pure fluff by default and leaves the rest alone", () => {
    expect(personalView(cliche, prefs()).fold).toEqual({ kind: "fluff" });
    expect(personalView(post(), prefs()).fold).toBeUndefined();
    expect(personalView(cliche, prefs({ foldAt: null })).fold).toBeUndefined();
  });

  it("never lets a category change the score", () => {
    const hidden = personalView(post(), prefs({ categories: { promo: "hide" } }));
    const wanted = personalView(post(), prefs({ categories: { promo: "want" } }));
    expect(hidden.index).toBe(wanted.index);
    expect(hidden.fold).toEqual({ kind: "category", category: "promo" });
    expect(wanted.wantedCategory).toBe(true);
  });

  it("folds a cliché only when the reader asks for it", () => {
    const bait = post({ signals: { engagement_bait: 0.9 } });
    expect(personalView(bait, prefs()).fold).toBeUndefined();
    expect(personalView(bait, prefs({ foldTropes: ["engagement_bait"] })).fold).toEqual({
      kind: "cliche",
      cliche: "engagement_bait",
    });
    const ai = post({ signals: { ai: 0.9 } });
    expect(personalView(ai, prefs({ foldTropes: ["ai"] })).fold).toEqual({
      kind: "cliche",
      cliche: "ai",
    });
  });

  it("keeps anything starred open", () => {
    const bait = post({ signals: { engagement_bait: 0.9 } });
    const data = { ...bait, good: { ...bait.good, real_take: 0.9 } };
    const folding = {
      foldTropes: ["engagement_bait" as const],
      categories: { promo: "hide" as const },
      wantGood: [],
    };
    expect(personalView(data, prefs(folding)).fold).toBeDefined();
    const view = personalView(data, prefs({ ...folding, wantGood: ["real_take"] }));
    expect(view.fold).toBeUndefined();
    expect(view.wantedGood).toEqual(["real_take"]);
  });

  it("folds hidden topics, and a wanted topic beats a hidden category", () => {
    const rust = post({ topics: { Rust: 0.9, crypto: 0.1 } });
    const topics = [
      { label: "Rust", mode: "want" as const },
      { label: "crypto", mode: "hide" as const },
    ];
    const view = personalView(rust, prefs({ topics, categories: { promo: "hide" } }));
    expect(view.fold).toBeUndefined();
    expect(view.wantedTopics).toEqual(["Rust"]);

    const coin = post({ topics: { Rust: 0.1, crypto: 0.9 } });
    expect(personalView(coin, prefs({ topics })).fold).toEqual({ kind: "topic", topic: "crypto" });
  });

  it("never folds a post with a good sign for fluff", () => {
    const data = { ...cliche, good: { ...cliche.good, insight: 0.9 } };
    expect(personalView(data, prefs()).fold).toBeUndefined();
    // Good signs always show by default; without that star, a folded category still folds.
    expect(personalView(data, prefs({ categories: { promo: "hide" } })).fold).toBeUndefined();
    expect(personalView(data, prefs({ categories: { promo: "hide" }, wantGood: [] })).fold).toEqual(
      { kind: "category", category: "promo" },
    );
  });

  it("never folds a post about a tragedy", () => {
    const loss = post({ sensitive: 0.9, signals: { buzzwords: 1, fluff: 1, engagement_bait: 1 } });
    expect(loss.sensitive).toBe(true);
    expect(personalView(loss, prefs({ foldAt: 0 })).fold).toBeUndefined();
  });
});

describe("normalizeDisplay", () => {
  it("turns settings from 0.2 into the current shape", () => {
    const old = {
      showIndex: true,
      showAi: false,
      hiddenCategories: ["event"],
      hiddenTropes: ["routine", "hustle"],
      tropeWeights: { routine: 0.8 },
      categoryWeights: { event: 1 },
    } as unknown as Partial<DisplayPrefs>;
    expect(normalizeDisplay(old)).toEqual(DEFAULT_DISPLAY);
  });

  it("keeps a 0.3 reader's cliché chips off, and shows good signs by default", () => {
    const allOff = {
      showAi: false,
      hiddenTropes: ["engagement_bait", "humblebrag", "parable", "truism", "hustle", "broetry"],
    } as unknown as Partial<DisplayPrefs>;
    expect(normalizeDisplay(allOff)).toMatchObject({
      showCliches: false,
      showGood: true,
      wantGood: DEFAULT_DISPLAY.wantGood,
    });
  });

  it("drops unknown categories and broken topics", () => {
    const d = normalizeDisplay({
      categories: { know_how: "want", technical: "hide" } as DisplayPrefs["categories"],
      topics: [
        { label: "Rust", mode: "want" },
        { label: 3, mode: "x" },
      ] as DisplayPrefs["topics"],
    });
    expect(d.categories).toEqual({ know_how: "want" });
    expect(d.topics).toEqual([{ label: "Rust", mode: "want" }]);
  });
});
