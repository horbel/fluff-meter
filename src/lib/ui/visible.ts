import type { Analysis, CategoryId, TropeId } from "../analysis/types";
import type { DisplayPrefs } from "../settings";

/** A post never gets more labels than this, however many tropes it hits. */
export const MAX_LABELS = 5;

export interface VisibleParts {
  index: boolean;
  ai: boolean;
  category?: CategoryId;
  tropes: TropeId[];
}

/** Applies the user's display preferences and the label cap to one result. */
export function visibleParts(analysis: Analysis, prefs: DisplayPrefs): VisibleParts {
  const category = prefs.hiddenCategories.includes(analysis.category)
    ? undefined
    : analysis.category;
  const room = MAX_LABELS - (category ? 1 : 0);
  const tropes = analysis.tropes.filter((t) => !prefs.hiddenTropes.includes(t)).slice(0, room);
  return { index: prefs.showIndex, ai: prefs.showAi, ...(category ? { category } : {}), tropes };
}

export function isEmpty(parts: VisibleParts): boolean {
  return !parts.index && !parts.ai && !parts.category && parts.tropes.length === 0;
}
