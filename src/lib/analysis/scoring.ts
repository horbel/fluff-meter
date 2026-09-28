import { contrast } from "./curve";
import { broetry, type TextStats } from "./heuristics";
import {
  type AiVerdict,
  type Analysis,
  type AnalysisSource,
  type CategoryId,
  GOOD_SIGN_IDS,
  type GoodSignId,
  type SignalId,
  type Signals,
  type TropeId,
} from "./types";
import { RUBRIC_VERSION } from "./version";

/**
 * The Fluff Index answers one question: how much of the post is empty words instead of facts.
 * Two signals only: nothing concrete (no numbers, names, steps, examples) and buzzwords.
 *
 * Everything else is a tag, not a score. Clichés, the AI guess and 📊 Real numbers show as
 * chips, and the reader decides what to do with them; what a post is about (its category)
 * is the reader's call too, see lib/personal.ts. So a solid post with one "humbled to share"
 * stays solid and gets a 🙏 chip.
 *
 * index = 100 × contrast(weighted average), an S-curve that spreads the middle (see curve.ts).
 */
export const CORE_WEIGHTS = { fluff: 0.7, buzzwords: 0.3 } as const;
export type CoreSignal = keyof typeof CORE_WEIGHTS;
export const CORE_SIGNALS = Object.keys(CORE_WEIGHTS) as CoreSignal[];

/** Tuned on the sample posts; see the table in docs/how-it-works.md. */
const CONTRAST_MID = 0.42;
const CONTRAST_STEEPNESS = 9;

/** A cliché chip appears when Jev says "yes" with at least this probability. */
export const TROPE_THRESHOLD = 0.6;
/** Same bar for "this post is about a tragedy, stay quiet". */
export const SENSITIVE_THRESHOLD = 0.6;
/** And for every good sign. */
export const GOOD_THRESHOLD = 0.6;
const BROETRY_THRESHOLD = 0.5;

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

export function fluffIndex(signals: Signals): number {
  let raw = 0;
  for (const id of CORE_SIGNALS) raw += CORE_WEIGHTS[id] * clamp01(signals[id]);
  return Math.round(contrast(raw, CONTRAST_MID, CONTRAST_STEEPNESS) * 100);
}

/** Clichés Jev judges; the signal of the same name is how sure it is. Broetry is measured in code. */
export const TROPE_SIGNALS = [
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
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
  /** Probability that the post is about a tragedy. */
  sensitive?: number;
  /** Probability of each good sign; missing ones count as 0. */
  good?: Partial<Record<GoodSignId, number>>;
  topics?: Record<string, number>;
  source: AnalysisSource;
  model?: string;
  /** Input tokens the request cost, for the popup's analytics. */
  tokens?: number;
}): Analysis {
  const ai = { likelihood: clamp01(input.ai.likelihood), tells: input.ai.tells };
  const signals = Object.fromEntries(
    Object.entries({ ...input.signals, ai: ai.likelihood }).map(([k, v]) => [k, clamp01(v)]),
  ) as Signals;
  const topics = Object.fromEntries(
    Object.entries(input.topics ?? {}).map(([label, p]) => [label, clamp01(p)]),
  );
  return {
    index: fluffIndex(signals),
    category: input.category,
    categoryConfidence: clamp01(input.categoryConfidence),
    signals,
    tropes: detectTropes(signals, input.stats),
    lines: {
      count: input.stats.paragraphs,
      avgChars: Math.round(input.stats.avgParagraph),
    },
    ai,
    sensitive: clamp01(input.sensitive ?? 0) >= SENSITIVE_THRESHOLD,
    good: Object.fromEntries(
      GOOD_SIGN_IDS.map((id) => [id, clamp01(input.good?.[id] ?? 0)]),
    ) as Record<GoodSignId, number>,
    topics,
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
