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

/** Sorted by `min`, descending. The first tier whose `min` fits wins. */
export const VERDICTS: readonly Verdict[] = [
  { min: 90, label: "Pure fluff", emoji: "☁️", hue: 0 },
  { min: 75, label: "Very fluffy", emoji: "🎈", hue: 12 },
  { min: 55, label: "Fluffy", emoji: "🧁", hue: 28 },
  { min: 35, label: "A bit fluffy", emoji: "🍃", hue: 45 },
  { min: 15, label: "Mostly solid", emoji: "👍", hue: 90 },
  { min: 0, label: "Pure signal", emoji: "🧠", hue: 140 },
];

export function verdictFor(index: number): Verdict {
  return VERDICTS.find((v) => index >= v.min) ?? (VERDICTS.at(-1) as Verdict);
}

/** The easter egg's verdict. Off the green → red scale on purpose. */
export const LEGEND_VERDICT: Verdict = { min: 0, label: "Zero fluff", emoji: "🦄", hue: 275 };
export const LEGEND_CHIP = "✨ Legend";

export const CATEGORY_LABELS: Record<CategoryId, { label: string; emoji: string }> = {
  motivational: { label: "Motivation", emoji: "🚀" },
  technical: { label: "Tech", emoji: "🛠️" },
  career_news: { label: "Career", emoji: "🎉" },
  hiring: { label: "Hiring", emoji: "📣" },
  job_seeking: { label: "Job hunt", emoji: "🔎" },
  event: { label: "Event", emoji: "🤝" },
  company_news: { label: "Company", emoji: "🏢" },
  hot_take: { label: "Hot take", emoji: "🌶️" },
  personal_story: { label: "Story", emoji: "📖" },
  promo: { label: "Promo", emoji: "💸" },
  humor: { label: "Humor", emoji: "😂" },
  industry_news: { label: "News", emoji: "📰" },
  other: { label: "Other", emoji: "🌀" },
};

export const TROPE_LABELS: Record<TropeId, { label: string; emoji: string; hint: string }> = {
  engagement_bait: { label: "Bait", emoji: "🎣", hint: "Begs for likes, comments or reposts" },
  humblebrag: { label: "Humblebrag", emoji: "🙏", hint: "A brag dressed up as humility" },
  parable: { label: "Parable", emoji: "📜", hint: "A dramatic story with a business moral" },
  truism: { label: "Truism", emoji: "💡", hint: "An obvious idea sold as insight" },
  hustle: { label: "Hustle", emoji: "⏰", hint: "Overwork as a virtue" },
  sales_pitch: { label: "Pitch", emoji: "🛒", hint: "Wants you to buy, book or DM" },
  broetry: { label: "Broetry", emoji: "🪶", hint: "One sentence per line" },
  routine: {
    label: "Routine",
    emoji: "🥱",
    hint: "An update only the author's friends care about",
  },
};

export const SIGNAL_LABELS: Record<SignalId, string> = {
  buzzwords: "Buzzwords",
  fluff: "No substance",
  self_promotion: "Self-promo",
  engagement_bait: "Bait",
  humblebrag: "Humblebrag",
  parable: "Parable",
  truism: "Truisms",
  hustle: "Hustle",
  routine: "Routine",
  ai: "AI style",
  sales_pitch: "Pitch",
  formatting: "Emoji & broetry",
};

/** The AI chip. It is a guess from style, and the wording keeps it one. */
export function aiLabel(likelihood: number): {
  emoji: string;
  label: string;
  level: "human" | "maybe" | "ai";
} {
  const pct = Math.round(likelihood * 100);
  if (pct >= 65) return { emoji: "🤖", label: `AI ${pct}%`, level: "ai" };
  if (pct >= 35) return { emoji: "🤔", label: `AI? ${pct}%`, level: "maybe" };
  return { emoji: "✍️", label: "Human", level: "human" };
}

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
