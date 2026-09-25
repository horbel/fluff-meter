import { fluffIndex, TROPE_SIGNAL, type TropeSignal } from "./analysis/scoring";
import type { Analysis, CategoryId } from "./analysis/types";
import type { DisplayPrefs } from "./settings";

/** A topic counts as matched from this probability on. */
export const TOPIC_THRESHOLD = 0.6;

export type FoldReason =
  | { kind: "fluff" }
  | { kind: "category"; category: CategoryId }
  | { kind: "topic"; topic: string };

/** One post as this reader sees it. Computed at display time from the cached analysis. */
export interface PersonalView {
  index: number;
  /** Why the post is folded, if it is. */
  fold?: FoldReason;
  /** The post's category is one the reader wants. */
  wantedCategory: boolean;
  /** The reader's wanted topics this post is about. */
  wantedTopics: string[];
}

/** The clichés the reader switched off. Off means not shown and not counted. */
export function offSignals(prefs: DisplayPrefs): Set<TropeSignal> {
  const off = new Set<TropeSignal>(prefs.hiddenTropes.map((id) => TROPE_SIGNAL[id]));
  if (!prefs.showAi) off.add("ai");
  return off;
}

export function matchedTopics(analysis: Analysis, prefs: DisplayPrefs, mode: "want" | "hide") {
  return prefs.topics
    .filter((t) => t.mode === mode && (analysis.topics?.[t.label] ?? 0) >= TOPIC_THRESHOLD)
    .map((t) => t.label);
}

/**
 * Rules, in order:
 * 1. A post about a tragedy is never folded (and gets no badge at all, see badge.ts).
 * 2. A topic the reader hides folds the post.
 * 3. A category the reader hides folds it, unless it is also about a topic they want.
 * 4. Fluff at or above the reader's threshold folds it, whatever it is about.
 */
export function personalView(analysis: Analysis, prefs: DisplayPrefs): PersonalView {
  const legend = analysis.source === "legend";
  const index = legend ? 0 : fluffIndex(analysis.signals, offSignals(prefs));
  const wantedTopics = matchedTopics(analysis, prefs, "want");
  const hiddenTopic = matchedTopics(analysis, prefs, "hide")[0];
  const categoryMode = prefs.categories[analysis.category];

  let fold: FoldReason | undefined;
  if (legend || analysis.sensitive) fold = undefined;
  else if (hiddenTopic) fold = { kind: "topic", topic: hiddenTopic };
  else if (categoryMode === "hide" && wantedTopics.length === 0)
    fold = { kind: "category", category: analysis.category };
  else if (prefs.foldAt !== null && index >= prefs.foldAt) fold = { kind: "fluff" };

  return {
    index,
    ...(fold ? { fold } : {}),
    wantedCategory: categoryMode === "want",
    wantedTopics,
  };
}
