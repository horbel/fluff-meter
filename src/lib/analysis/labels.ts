import type { AiTellId, CategoryId, SignalId, TropeId } from "./types";

/**
 * Every user-facing label lives here, so copy tweaks never touch logic.
 * Keep them to one or two words: they sit in a single row above the post.
 */

export interface Verdict {
  min: number;
  label: string;
  emoji: string;
  /** Hue on the green → red scale, used for the meter and the index pill. */
  hue: number;
}

/**
 * Sorted by `min`, descending. The first tier whose `min` fits wins. The emoji are weather: the
 * more fluff, the more cloud. The badge shows the gauge instead; emoji go into the popup and
 * the copied text.
 */
export const VERDICTS: readonly Verdict[] = [
  { min: 85, label: "Pure fluff", emoji: "☁️", hue: 0 },
  { min: 60, label: "Fluffy", emoji: "🌥️", hue: 22 },
  { min: 30, label: "Light fluff", emoji: "🌤️", hue: 42 },
  { min: 0, label: "Solid", emoji: "☀️", hue: 140 },
];

export function verdictFor(index: number): Verdict {
  return VERDICTS.find((v) => index >= v.min) ?? (VERDICTS.at(-1) as Verdict);
}

/** The easter egg's verdict. Off the green → red scale on purpose. */
export const LEGEND_VERDICT: Verdict = { min: 0, label: "Zero fluff", emoji: "🦄", hue: 275 };
export const LEGEND_CHIP = "✨ Legend";

export const CATEGORY_LABELS: Record<CategoryId, { label: string; emoji: string }> = {
  know_how: { label: "Know-how", emoji: "🛠️" },
  news: { label: "News", emoji: "📰" },
  opinion: { label: "Opinion", emoji: "💬" },
  stories: { label: "Stories & lessons", emoji: "📖" },
  career_moves: { label: "Career moves", emoji: "🎉" },
  thanks: { label: "Thank-yous", emoji: "🙌" },
  hiring: { label: "Hiring", emoji: "📣" },
  job_hunt: { label: "Job hunt", emoji: "🔎" },
  events: { label: "Events", emoji: "🤝" },
  promo: { label: "Promo", emoji: "💸" },
  humor: { label: "Humor", emoji: "😂" },
  other: { label: "Other", emoji: "🌀" },
};

export const TROPE_LABELS: Record<TropeId, { label: string; emoji: string; hint: string }> = {
  engagement_bait: {
    label: "Bait",
    emoji: "🎣",
    hint: "Begs for likes, comments or reposts, or 'comment GUIDE for the PDF'",
  },
  humblebrag: { label: "Humblebrag", emoji: "🙏", hint: "A brag dressed up as humility" },
  parable: { label: "Fable", emoji: "📜", hint: "A too-neat story with a business moral" },
  truism: { label: "Truism", emoji: "💡", hint: "An obvious idea sold as insight" },
  hustle: {
    label: "Hustle",
    emoji: "⏰",
    hint: "The grind as a virtue: overwork, 4am, no days off",
  },
  broetry: { label: "Broetry", emoji: "🪶", hint: "One sentence per line" },
};

/** The one positive chip: the post shares real data or results. */
export const INSIGHT_LABEL = {
  label: "Real numbers",
  emoji: "📊",
  hint: "Shares real data or results: metrics, benchmarks, outcomes",
};

export const SIGNAL_LABELS: Record<SignalId, string> = {
  buzzwords: "Buzzwords",
  fluff: "Nothing concrete",
  self_promotion: "Self-promo",
  engagement_bait: "Bait",
  humblebrag: "Humblebrag",
  parable: "Fable",
  truism: "Truisms",
  hustle: "Hustle",
  ai: "AI style",
  formatting: "Emoji & broetry",
};

/**
 * The AI chip. It is a guess from style, so the chip says it in words and the number goes in the
 * tooltip and the breakdown: one number per post (the Fluff Index) is enough on the badge.
 */
export function aiLabel(likelihood: number): {
  emoji: string;
  label: string;
  /** For the tooltip and the breakdown. */
  percent: string;
  level: "human" | "maybe" | "ai";
} {
  const pct = Math.round(likelihood * 100);
  const percent = `${pct}%`;
  if (pct >= 65) return { emoji: "🤖", label: "Reads like AI", percent, level: "ai" };
  if (pct >= 35) return { emoji: "🤔", label: "Maybe AI", percent, level: "maybe" };
  return { emoji: "✍️", label: "Human", percent, level: "human" };
}

/** What each row of the breakdown measures, for its tooltip. */
export const SIGNAL_HINTS: Record<SignalId, string> = {
  buzzwords: "Corporate jargon instead of plain words",
  fluff: "No numbers, names, steps, code or examples",
  self_promotion: "About making the author look impressive",
  engagement_bait: "Asks for likes, comments, reposts or a keyword",
  humblebrag: "An achievement dressed up as humility or gratitude",
  parable: "A too-neat story that ends with a moral",
  truism: "An obvious idea presented as a deep insight",
  hustle: "Glorifies the grind: overwork, 4am, no days off",
  ai: "Reads like an AI assistant wrote it",
  formatting: "One-line paragraphs, emoji bullets, hashtag walls",
};

export const AI_TELL_LABELS: Record<AiTellId, string> = {
  ai_words: "AI words",
  not_x_but_y: "Not X, but Y",
  triads: "Rule of three",
  fragments: "Punchy fragments",
  fake_candor: "Fake candor",
  dashes: "Em dashes",
  fancy_bold: "𝗙𝗮𝗻𝗰𝘆 bold",
  arrows: "Arrows",
  emoji_bullets: "Emoji bullets",
};
