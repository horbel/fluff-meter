import type { Analysis, CategoryId, ClicheId, GoodSignId } from "../analysis/types";
import { clichesOf, goodSignsOf } from "../personal";
import type { DisplayPrefs } from "../settings";

/** Chips of one kind on one post, strongest first. More turns the row into a wall. */
export const MAX_CHIPS = 2;

export interface VisibleParts {
  index: boolean;
  /** Clichés to show, the 🤖 chip last (only when the post clearly reads like AI). */
  cliches: ClicheId[];
  good: GoodSignId[];
  category?: CategoryId;
}

/** Applies the reader's display preferences and the chip caps to one result. */
export function visibleParts(analysis: Analysis, prefs: DisplayPrefs): VisibleParts {
  const all = clichesOf(analysis);
  const tropes = all.filter((id) => id !== "ai").slice(0, MAX_CHIPS);
  const ai = all.includes("ai") ? (["ai"] as const) : [];
  return {
    index: prefs.showIndex,
    cliches: prefs.showCliches ? [...tropes, ...ai] : [],
    good: prefs.showGood ? goodSignsOf(analysis).slice(0, MAX_CHIPS) : [],
    ...(prefs.showCategory ? { category: analysis.category } : {}),
  };
}

export function isEmpty(parts: VisibleParts): boolean {
  return !parts.index && !parts.category && parts.cliches.length + parts.good.length === 0;
}
