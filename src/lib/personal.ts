import { aiLabel } from "./analysis/labels";
import { GOOD_THRESHOLD } from "./analysis/scoring";
import {
  type Analysis,
  type CategoryId,
  type ClicheId,
  GOOD_SIGN_IDS,
  type GoodSignId,
} from "./analysis/types";
import type { DisplayPrefs } from "./settings";

/** A topic counts as matched from this probability on. */
export const TOPIC_THRESHOLD = 0.6;

export type FoldReason =
  | { kind: "fluff" }
  | { kind: "category"; category: CategoryId }
  | { kind: "topic"; topic: string }
  | { kind: "cliche"; cliche: ClicheId }
  /** The reader folded it by hand. */
  | { kind: "manual" };

/** One post as this reader sees it. Computed at display time from the cached analysis. */
export interface PersonalView {
  index: number;
  /** Why the post is folded, if it is. */
  fold?: FoldReason;
  /** The post's category is one the reader wants. */
  wantedCategory: boolean;
  /** The reader's wanted topics this post is about. */
  wantedTopics: string[];
  /** Good signs the post has and the reader stars. */
  wantedGood: GoodSignId[];
}

/** Every cliché the post has, the AI guess included, strongest first. */
export function clichesOf(analysis: Analysis): ClicheId[] {
  const ai = aiLabel(analysis.ai.likelihood).level === "ai";
  return [...analysis.tropes, ...(ai ? (["ai"] as const) : [])];
}

/** Every good sign the post has, strongest first. */
export function goodSignsOf(analysis: Analysis): GoodSignId[] {
  return GOOD_SIGN_IDS.filter((id) => (analysis.good?.[id] ?? 0) >= GOOD_THRESHOLD).sort(
    (a, b) => analysis.good[b] - analysis.good[a],
  );
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
 * 3. Anything the reader stars (a category, a topic, a good sign) keeps it open.
 * 4. A category the reader hides folds it.
 * 5. So does a cliché the reader folds.
 * 6. Fluff at or above the reader's threshold folds it, unless the post has a good sign: then
 *    it is worth a look however it's written.
 */
export function personalView(analysis: Analysis, prefs: DisplayPrefs): PersonalView {
  const wantedTopics = matchedTopics(analysis, prefs, "want");
  const hiddenTopic = matchedTopics(analysis, prefs, "hide")[0];
  const categoryMode = prefs.categories[analysis.category];
  const wantedCategory = categoryMode === "want";
  const good = goodSignsOf(analysis);
  const wantedGood = good.filter((id) => prefs.wantGood.includes(id));
  const starred = wantedCategory || wantedTopics.length > 0 || wantedGood.length > 0;
  const foldedCliche = clichesOf(analysis).find((id) => prefs.foldTropes.includes(id));

  let fold: FoldReason | undefined;
  if (analysis.sensitive) fold = undefined;
  else if (hiddenTopic) fold = { kind: "topic", topic: hiddenTopic };
  else if (starred) fold = undefined;
  else if (categoryMode === "hide") fold = { kind: "category", category: analysis.category };
  else if (foldedCliche) fold = { kind: "cliche", cliche: foldedCliche };
  else if (prefs.foldAt !== null && analysis.index >= prefs.foldAt && good.length === 0)
    fold = { kind: "fluff" };

  return {
    index: analysis.index,
    ...(fold ? { fold } : {}),
    wantedCategory,
    wantedTopics,
    wantedGood,
  };
}
