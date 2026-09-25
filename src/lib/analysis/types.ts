/** Every signal is normalised to 0..1, where 1 always means "more fluff". */
export const SIGNAL_IDS = [
  "buzzwords",
  "fluff",
  "self_promotion",
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
  /** How much the post reads like AI output; see ai.ts. */
  "ai",
  "formatting",
] as const;
export type SignalId = (typeof SIGNAL_IDS)[number];
export type Signals = Record<SignalId, number>;

/**
 * What a post is about. Neutral on purpose: a category never makes a post fluffier, the
 * reader decides which ones they want and which ones to fold. How a post is written is the
 * job of the tropes below.
 */
export const CATEGORY_IDS = [
  "know_how",
  "news",
  "opinion",
  "stories",
  "career_moves",
  "hiring",
  "job_hunt",
  "events",
  "promo",
  "humor",
  "other",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Clichés that annoy everyone. They drive the index; the reader can switch any of them off. */
export const TROPE_IDS = [
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
  "broetry",
] as const;
export type TropeId = (typeof TROPE_IDS)[number];

/** Style tells of AI writing. The model judges the first five, code measures the rest. */
export const AI_TELL_IDS = [
  "ai_words",
  "not_x_but_y",
  "triads",
  "fragments",
  "fake_candor",
  "dashes",
  "fancy_bold",
  "arrows",
  "emoji_bullets",
] as const;
export type AiTellId = (typeof AI_TELL_IDS)[number];

export interface AiVerdict {
  /** 0..1, how much the post reads like AI output. A guess from style, not proof. */
  likelihood: number;
  /** Tells that fired, strongest first. */
  tells: AiTellId[];
}

/** `legend` is the easter egg: see easter-egg.ts. */
export type AnalysisSource = "jev" | "demo" | "legend";

export interface Analysis {
  /** Fluff Index, integer 0..100. */
  index: number;
  category: CategoryId;
  /** Jev's confidence in the category (0..1). */
  categoryConfidence: number;
  signals: Signals;
  tropes: TropeId[];
  ai: AiVerdict;
  /**
   * The post is about death, war, illness or another tragedy. Such posts get no score and no
   * labels at all: judging them would be cruel, whatever the writing.
   */
  sensitive: boolean;
  /** The reader's own topics (see settings.ts) and how likely the post is about each, 0..1. */
  topics: Record<string, number>;
  source: AnalysisSource;
  /** Versioned model id that answered, e.g. "jev-1.13.0". Absent in demo mode. */
  model?: string;
  /** Input tokens the request cost. Absent in demo mode and for cached results. */
  tokens?: number;
  rubricVersion: number;
}

export interface PostInput {
  /** The author's own text. */
  text: string;
  /** Text of the post being reshared, if this is a repost. */
  reshared?: string;
  /**
   * Profile of whoever wrote `text`, e.g. "in:jane-doe-123" or "company:acme". Used only for
   * the easter egg; it is never sent to the API.
   */
  author?: string;
}

/** A reader's own category, e.g. "Rust" or "crypto": shown as a chip or folded. */
export interface Topic {
  label: string;
  mode: "want" | "hide";
}

export type AnalysisErrorCode =
  | "invalid_key"
  | "no_credits"
  | "rate_limited"
  | "network"
  | "bad_response"
  | "api_error";

export class AnalysisError extends Error {
  constructor(
    readonly code: AnalysisErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}
