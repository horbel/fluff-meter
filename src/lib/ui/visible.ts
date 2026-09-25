import { aiLabel } from "../analysis/labels";
import type { Analysis, CategoryId, TropeId } from "../analysis/types";
import type { DisplayPrefs } from "../settings";

/** Clichés on one post, strongest first. More than two turns the row into a wall. */
export const MAX_TROPES = 2;

export interface VisibleParts {
  index: boolean;
  /** Only when the post clearly reads like AI: a "✍️ Human" chip on every post is noise. */
  ai: boolean;
  category?: CategoryId;
  tropes: TropeId[];
}

/** Applies the reader's display preferences and the label cap to one result. */
export function visibleParts(analysis: Analysis, prefs: DisplayPrefs): VisibleParts {
  const tropes = analysis.tropes
    .filter((t) => !prefs.hiddenTropes.includes(t))
    .slice(0, MAX_TROPES);
  return {
    index: prefs.showIndex,
    ai: prefs.showAi && aiLabel(analysis.ai.likelihood).level === "ai",
    ...(prefs.showCategory ? { category: analysis.category } : {}),
    tropes,
  };
}

export function isEmpty(parts: VisibleParts): boolean {
  return !parts.index && !parts.ai && !parts.category && parts.tropes.length === 0;
}
