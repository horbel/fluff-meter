import { describe, expect, it } from "vitest";
import { rulesOf, verbFor, withoutRule, withRule } from "@/lib/rules";
import { DEFAULT_DISPLAY } from "@/lib/settings";

describe("rules", () => {
  it("lists the default fluff fold and nothing starred", () => {
    expect(rulesOf(DEFAULT_DISPLAY, "fold")).toEqual([{ kind: "fluff", at: 85 }]);
    expect(rulesOf(DEFAULT_DISPLAY, "star").map((r) => r.kind)).toEqual(["good", "good", "good"]);
  });

  it("gives a category one verb only: starring it stops folding it", () => {
    const promo = { kind: "category", id: "promo" } as const;
    const folded = withRule(DEFAULT_DISPLAY, "fold", promo);
    expect(verbFor(folded, promo)).toBe("fold");
    const starred = withRule(folded, "star", promo);
    expect(verbFor(starred, promo)).toBe("star");
    expect(rulesOf(starred, "fold")).not.toContainEqual(promo);
  });

  it("adds and removes clichés, good signs and topics", () => {
    const bait = { kind: "cliche", id: "engagement_bait" } as const;
    const take = { kind: "good", id: "real_take" } as const;
    const rust = { kind: "topic", label: "Rust" } as const;
    const start = { ...DEFAULT_DISPLAY, wantGood: [] };
    let prefs = withRule(start, "fold", bait);
    prefs = withRule(prefs, "star", take);
    prefs = withRule(prefs, "star", rust);
    expect(prefs.foldTropes).toEqual(["engagement_bait"]);
    expect(prefs.wantGood).toEqual(["real_take"]);
    expect(prefs.topics).toEqual([{ label: "Rust", mode: "want" }]);
    expect(verbFor(prefs, { kind: "topic", label: "rust" })).toBe("star");

    prefs = withoutRule(withoutRule(withoutRule(prefs, bait), take), rust);
    expect(prefs).toEqual(start);
  });

  it("changes a topic's verb in place, so the topic order (part of the cache key) holds", () => {
    const topics = [
      { label: "Rust", mode: "want" as const },
      { label: "crypto", mode: "hide" as const },
    ];
    const prefs = withRule({ ...DEFAULT_DISPLAY, topics }, "fold", {
      kind: "topic",
      label: "rust",
    });
    expect(prefs.topics).toEqual([
      { label: "Rust", mode: "hide" },
      { label: "crypto", mode: "hide" },
    ]);
  });

  it("moves the fluff fold instead of adding a second one", () => {
    const fluffy = withRule(DEFAULT_DISPLAY, "fold", { kind: "fluff", at: 60 });
    expect(rulesOf(fluffy, "fold")).toEqual([{ kind: "fluff", at: 60 }]);
    expect(withoutRule(fluffy, { kind: "fluff", at: 60 }).foldAt).toBeNull();
  });
});
