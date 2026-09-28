import type { AiTellId, CategoryId, ClicheId, GoodSignId, SignalId, TropeId } from "./types";

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

/** The easter egg's chip, see easter-egg.ts. */
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

/** A cliché or a good sign: a chip on the badge and a row in the popup. */
export interface TagLabel {
  label: string;
  emoji: string;
  hint: string;
  /** What it looks like in a post, for the tooltip. */
  example: string;
}

/** Hint and example on two lines, then anything else (how sure Jev is, say). */
export function tagTooltip(tag: TagLabel, ...more: string[]): string {
  return [tag.hint, `e.g. ${tag.example}`, ...more].join("\n");
}

export const TROPE_LABELS: Record<TropeId, TagLabel> = {
  engagement_bait: {
    label: "Bait",
    emoji: "🎣",
    hint: "Begs for likes, comments or reposts",
    example: "“Agree? 👇” · “Comment GUIDE and I'll DM you the PDF”",
  },
  humblebrag: {
    label: "Humblebrag",
    emoji: "🙏",
    hint: "A brag dressed up as humility",
    example: "“Humbled to announce…” · “Never expected to hit 10,000 followers”",
  },
  parable: {
    label: "Fable",
    emoji: "📜",
    hint: "A too-neat story with a business moral",
    example: "“A janitor told me one thing that changed how I lead…”",
  },
  truism: {
    label: "Truism",
    emoji: "💡",
    hint: "An obvious idea sold as insight",
    example: "“Consistency beats talent.” · “Your network is your net worth.”",
  },
  hustle: {
    label: "Hustle",
    emoji: "⏰",
    hint: "The grind as a virtue: overwork, 4am, no days off",
    example: "“5am. No weekends. No excuses.”",
  },
  broetry: {
    label: "Broetry",
    emoji: "🪶",
    hint: "One short sentence per line, again and again",
    example: "“I got fired. / I cried. / Then I learned.”",
  },
};

/** Clichés as the reader sees them: the tropes plus the AI guess. */
export const CLICHE_LABELS: Record<ClicheId, TagLabel> = {
  ...TROPE_LABELS,
  ai: {
    label: "Reads like AI",
    emoji: "🤖",
    hint: "Em dashes, stock phrases, template structure. A guess from style, not proof",
    example: "“It's not X — it's Y.” · “Here's the thing:” · 𝗯𝗼𝗹𝗱 letters",
  },
};

/**
 * The three kinds of thing a badge shows, in the words the popup and the breakdown use. Only
 * the first one is a number.
 */
export const SECTIONS = {
  fluff: { title: "Fluff", hint: "How much of the post is empty words instead of facts" },
  cliches: { title: "Clichés", hint: "How it's written. Tags only: they never change the score" },
  good: { title: "Good signs", hint: "Worth a look. Tags only, like clichés" },
  about: { title: "Category", hint: "What it's about. You decide what you want" },
} as const;

/** The one positive chip: the post shares real data or results. */
export const GOOD_LABELS: Record<GoodSignId, TagLabel> = {
  insight: {
    label: "Real numbers",
    emoji: "📊",
    hint: "Shares real data or results: metrics, benchmarks, outcomes",
    example: "“We cut p99 latency from 1.2s to 180ms” · “churn fell from 8% to 5%”",
  },
  real_take: {
    label: "Real take",
    emoji: "🥊",
    hint: "An opinion you could argue with, backed by facts",
    example: "“We banned standups: cycle time went from 5 to 4 days, here's why”",
  },
  owns_mistake: {
    label: "Owns a mistake",
    emoji: "🌿",
    hint: "The author admits a specific mistake and what they changed",
    example: "“I waited 7 months on a bad hire and one engineer quit. Now I…”",
  },
};

export const SIGNAL_LABELS: Record<SignalId, string> = {
  buzzwords: "Corporate jargon",
  fluff: "Nothing concrete",
  engagement_bait: "Bait",
  humblebrag: "Humblebrag",
  parable: "Fable",
  truism: "Truisms",
  hustle: "Hustle",
  ai: "AI style",
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
  engagement_bait: "Asks for likes, comments, reposts or a keyword",
  humblebrag: "An achievement dressed up as humility or gratitude",
  parable: "A too-neat story that ends with a moral",
  truism: "An obvious idea presented as a deep insight",
  hustle: "Glorifies the grind: overwork, 4am, no days off",
  ai: "Reads like an AI assistant wrote it",
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
