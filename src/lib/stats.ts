import { storage } from "#imports";
import {
  type Analysis,
  CATEGORY_IDS,
  type CategoryId,
  TROPE_IDS,
  type TropeId,
} from "./analysis/types";

/**
 * Feed analytics: one bucket of counters per local day, nothing else. No post text, no
 * authors, nothing that identifies a post. Each post is counted once, the first time it is
 * scored. Demo mode is never counted, since its numbers are random.
 */
export interface DayStats {
  posts: number;
  indexSum: number;
  worst: number;
  /** Posts that read as AI (the 🤖 chip). */
  ai: number;
  /** Input tokens spent. Optional: days recorded before tokens were tracked lack it. */
  tokens?: number;
  /** Posts folded for the reader. Optional: older days lack it. */
  folded?: number;
  /** Posts with real data or results (the 📊 chip). Optional: older days lack it. */
  insights?: number;
  categories: Partial<Record<CategoryId, number>>;
  tropes: Partial<Record<TropeId, number>>;
}

/** Keyed by local date, "2026-09-23". */
export type DailyStats = Record<string, DayStats>;

/** Older days are dropped, so storage stays tiny. Two months, so "30 days" has a trend. */
export const KEEP_DAYS = 60;
/** Same cut-off as the 🤖 chip. */
const AI_THRESHOLD = 0.65;
/**
 * A rough guess at what a folded post would have cost: a glance, "…more", a skim. Only used for
 * the "≈ N min saved" line, which says it is an estimate.
 */
export const SECONDS_PER_POST = 12;

export const dailyStatsItem = storage.defineItem<DailyStats>("local:daily-stats", {
  fallback: {},
  version: 1,
});

export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The keys of `days` local days ending `endsDaysAgo` days before `now`, newest first. */
function dayKeys(now: Date, days: number, endsDaysAgo = 0): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - endsDaysAgo - i);
    return dayKey(d);
  });
}

const EMPTY_DAY: DayStats = { posts: 0, indexSum: 0, worst: 0, ai: 0, categories: {}, tropes: {} };

function bump<K extends string>(counts: Partial<Record<K, number>>, ids: readonly K[]) {
  const next = { ...counts };
  for (const id of ids) next[id] = (next[id] ?? 0) + 1;
  return next;
}

/** Jev's list price per input token; output tokens are free. See docs.typesafe.ai/models. */
export const PRICE_PER_TOKEN = 0.042 / 1_000_000;

/** `index` is the one the reader saw, with their clichés applied; `folded` whether it was folded. */
export function recordAnalysis(
  daily: DailyStats,
  analysis: Analysis,
  now = new Date(),
  index = analysis.index,
  folded = false,
): DailyStats {
  const key = dayKey(now);
  const day = daily[key] ?? EMPTY_DAY;
  const keep = new Set(dayKeys(now, KEEP_DAYS));
  const kept = Object.fromEntries(Object.entries(daily).filter(([k]) => keep.has(k)));
  return {
    ...kept,
    [key]: {
      posts: day.posts + 1,
      indexSum: day.indexSum + index,
      worst: Math.max(day.worst, index),
      ai: day.ai + (analysis.ai.likelihood >= AI_THRESHOLD ? 1 : 0),
      tokens: (day.tokens ?? 0) + (analysis.tokens ?? 0),
      folded: (day.folded ?? 0) + (folded ? 1 : 0),
      insights: (day.insights ?? 0) + (analysis.insight ? 1 : 0),
      categories: bump(day.categories, [analysis.category]),
      tropes: bump(day.tropes, analysis.tropes),
    },
  };
}

export interface Share<K> {
  id: K;
  /** Fraction of the period's posts. */
  share: number;
}

export interface Summary {
  posts: number;
  avgIndex: number;
  worst: number;
  /** Fraction of posts that read as AI. */
  aiShare: number;
  tokens: number;
  /** Estimated spend in US dollars at Jev's list price. */
  cost: number;
  folded: number;
  /** Fraction of posts with real data or results. */
  insightShare: number;
  /** Estimated minutes not spent on folded posts. */
  minutesSaved: number;
  tropes: Share<TropeId>[];
  categories: Share<CategoryId>[];
  /** Average index of the period before, for a trend arrow. Absent without data. */
  previousAvg?: number;
}

function total(daily: DailyStats, keys: string[]): DayStats {
  let sum = EMPTY_DAY;
  for (const key of keys) {
    const day = daily[key];
    if (!day) continue;
    const merge = <K extends string>(
      a: Partial<Record<K, number>>,
      b: Partial<Record<K, number>>,
    ) => {
      const out = { ...a };
      for (const [id, n] of Object.entries(b) as [K, number][]) out[id] = (out[id] ?? 0) + n;
      return out;
    };
    sum = {
      posts: sum.posts + day.posts,
      indexSum: sum.indexSum + day.indexSum,
      worst: Math.max(sum.worst, day.worst),
      ai: sum.ai + day.ai,
      tokens: (sum.tokens ?? 0) + (day.tokens ?? 0),
      folded: (sum.folded ?? 0) + (day.folded ?? 0),
      insights: (sum.insights ?? 0) + (day.insights ?? 0),
      categories: merge(sum.categories, day.categories),
      tropes: merge(sum.tropes, day.tropes),
    };
  }
  return sum;
}

/** `known` drops ids from older versions (renamed categories, retired tropes). */
function shares<K extends string>(
  counts: Partial<Record<K, number>>,
  posts: number,
  known: readonly K[],
): Share<K>[] {
  return (Object.entries(counts) as [K, number][])
    .filter(([id, n]) => n > 0 && known.includes(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, share: posts ? n / posts : 0 }));
}

/** Totals for the last `days` days including today, and the same span before it. */
export function summarize(daily: DailyStats, days: number, now = new Date()): Summary {
  const current = total(daily, dayKeys(now, days));
  const previous = total(daily, dayKeys(now, days, days));
  const avg = (d: DayStats) => (d.posts ? Math.round(d.indexSum / d.posts) : 0);
  return {
    posts: current.posts,
    avgIndex: avg(current),
    worst: current.worst,
    aiShare: current.posts ? current.ai / current.posts : 0,
    tokens: current.tokens ?? 0,
    cost: (current.tokens ?? 0) * PRICE_PER_TOKEN,
    folded: current.folded ?? 0,
    insightShare: current.posts ? (current.insights ?? 0) / current.posts : 0,
    minutesSaved: Math.round(((current.folded ?? 0) * SECONDS_PER_POST) / 60),
    tropes: shares(current.tropes, current.posts, TROPE_IDS),
    categories: shares(current.categories, current.posts, CATEGORY_IDS),
    ...(previous.posts ? { previousAvg: avg(previous) } : {}),
  };
}
