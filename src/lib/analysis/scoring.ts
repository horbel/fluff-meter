import { contrast } from "./curve";
import { broetry, type TextStats } from "./heuristics";
import type {
  AiVerdict,
  Analysis,
  AnalysisSource,
  CategoryId,
  SignalId,
  Signals,
  TropeId,
} from "./types";
import { RUBRIC_VERSION } from "./version";

/**
 * The index has two parts, and both are tuned here rather than in the questions: changing a
 * number needs no new model call.
 *
 * 1. Core: how empty the language is. A weighted average of buzzwords, missing substance and
 *    self-promotion, which on its own can reach at most CORE_SHARE of the scale.
 * 2. Tropes: each one pushes the index the rest of the way towards 100, independently, so a
 *    post that hits five tropes ends up near the top instead of being averaged down.
 *
 * raw = 1 − (1 − CORE_SHARE × core) × Π (1 − weight × trope) × (1 − genre weight)
 * index = 100 × contrast(raw), an S-curve that spreads the middle (see curve.ts).
 */
export const CORE_WEIGHTS = { buzzwords: 0.4, fluff: 0.4, self_promotion: 0.2 } as const;
export const CORE_SHARE = 0.7;

type CoreSignal = keyof typeof CORE_WEIGHTS;
export type TropeSignal = Exclude<SignalId, CoreSignal>;

/** Defaults for the sliders in the popup. 1 means "a post with this is pure fluff". */
export const TROPE_WEIGHTS: Record<TropeSignal, number> = {
  engagement_bait: 0.35,
  humblebrag: 0.3,
  parable: 0.3,
  truism: 0.3,
  routine: 0.4,
  ai: 0.3,
  hustle: 0.2,
  formatting: 0.2,
  sales_pitch: 0.15,
};

/** Tuned on a real feed: raw scores of 0.14 / 0.4 / 0.54 / 0.69 become 8 / 48 / 75 / 91. */
const CONTRAST_MID = 0.4;
const CONTRAST_STEEPNESS = 8;

/** Yes/no answers below this are treated as "no", so faint maybes don't add up. */
const DEAD_ZONE = 0.15;

/** A trope chip appears when Jev says "yes" with at least this probability. */
export const TROPE_THRESHOLD = 0.6;
const BROETRY_THRESHOLD = 0.5;

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const beyondDeadZone = (x: number) => Math.max(0, (clamp01(x) - DEAD_ZONE) / (1 - DEAD_ZONE));

/** How much each signal can move the index with these weights; used to rank the breakdown. */
export function impact(
  weights: Partial<Record<TropeSignal, number>> = {},
): Record<SignalId, number> {
  const core = Object.fromEntries(
    Object.entries(CORE_WEIGHTS).map(([id, w]) => [id, w * CORE_SHARE]),
  ) as Record<CoreSignal, number>;
  const tropes = Object.fromEntries(
    (Object.keys(TROPE_WEIGHTS) as TropeSignal[]).map((id) => [
      id,
      clamp01(weights[id] ?? TROPE_WEIGHTS[id]),
    ]),
  ) as Record<TropeSignal, number>;
  return { ...core, ...tropes };
}

export function fluffIndex(
  signals: Signals,
  weights: Partial<Record<TropeSignal, number>> = {},
  categoryWeight = 0,
): number {
  let core = 0;
  for (const [id, weight] of Object.entries(CORE_WEIGHTS) as [CoreSignal, number][]) {
    core += weight * clamp01(signals[id]);
  }
  let clean = 1 - CORE_SHARE * core;
  for (const [id, fallback] of Object.entries(TROPE_WEIGHTS) as [TropeSignal, number][]) {
    clean *= 1 - clamp01(weights[id] ?? fallback) * beyondDeadZone(signals[id]);
  }
  // A genre the reader counts as fluff weighs on every post of that genre.
  clean *= 1 - clamp01(categoryWeight);
  return Math.round(contrast(1 - clean, CONTRAST_MID, CONTRAST_STEEPNESS) * 100);
}

/** Which weight each trope chip is driven by. Broetry is part of the formatting signal. */
export const TROPE_SIGNAL: Record<TropeId, TropeSignal> = {
  engagement_bait: "engagement_bait",
  humblebrag: "humblebrag",
  parable: "parable",
  truism: "truism",
  hustle: "hustle",
  routine: "routine",
  sales_pitch: "sales_pitch",
  broetry: "formatting",
};

const TROPE_SIGNALS = [
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
  "routine",
  "sales_pitch",
] as const satisfies readonly (SignalId & TropeId)[];

export function detectTropes(signals: Signals, stats: TextStats): TropeId[] {
  const strength = new Map<TropeId, number>();
  for (const id of TROPE_SIGNALS) {
    if (signals[id] >= TROPE_THRESHOLD) strength.set(id, signals[id]);
  }
  if (broetry(stats) >= BROETRY_THRESHOLD) strength.set("broetry", broetry(stats));
  // Strongest first, so the UI can show only the top few.
  return [...strength.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

export function buildAnalysis(input: {
  /** Everything except `ai`, which comes from the AI verdict. */
  signals: Omit<Signals, "ai">;
  ai: AiVerdict;
  stats: TextStats;
  category: CategoryId;
  categoryConfidence: number;
  source: AnalysisSource;
  model?: string;
  /** Input tokens the request cost, for the popup's analytics. */
  tokens?: number;
}): Analysis {
  const ai = { likelihood: clamp01(input.ai.likelihood), tells: input.ai.tells };
  const signals = Object.fromEntries(
    Object.entries({ ...input.signals, ai: ai.likelihood }).map(([k, v]) => [k, clamp01(v)]),
  ) as Signals;
  return {
    index: fluffIndex(signals),
    category: input.category,
    categoryConfidence: clamp01(input.categoryConfidence),
    signals,
    tropes: detectTropes(signals, input.stats),
    ai,
    source: input.source,
    ...(input.model ? { model: input.model } : {}),
    ...(input.tokens ? { tokens: input.tokens } : {}),
    rubricVersion: RUBRIC_VERSION,
  };
}

/** Maps a Score answer (0..levels-1) onto 0..1. */
export function normaliseScore(value: number, levels: number): number {
  return clamp01(value / (levels - 1));
}

/**
 * The reader's own weights from the popup, stored as overrides only. Trope weights default to
 * TROPE_WEIGHTS, genre weights to 0 (neutral).
 */
export interface PersonalWeights {
  tropeWeights: Partial<Record<TropeSignal, number>>;
  categoryWeights: Partial<Record<CategoryId, number>>;
}

/**
 * The index with the reader's weights applied. It is computed from the cached signals at
 * display time, so moving a slider needs no new model call.
 */
export function personalIndex(analysis: Analysis, weights: PersonalWeights): number {
  return fluffIndex(
    analysis.signals,
    weights.tropeWeights,
    weights.categoryWeights[analysis.category] ?? 0,
  );
}
