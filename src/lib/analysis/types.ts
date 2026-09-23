/** Every signal is normalised to 0..1, where 1 always means "more bullshit". */
export const SIGNAL_IDS = [
  "buzzwords",
  "fluff",
  "self_promotion",
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
  /** A new job, anniversary or thank-you only the author's friends care about. */
  "routine",
  /** How much the post reads like AI output; see ai.ts. */
  "ai",
  "sales_pitch",
  "formatting",
] as const;
export type SignalId = (typeof SIGNAL_IDS)[number];
export type Signals = Record<SignalId, number>;

export const CATEGORY_IDS = [
  "motivational",
  "technical",
  "career_news",
  "hiring",
  "job_seeking",
  "event",
  "company_news",
  "hot_take",
  "personal_story",
  "promo",
  "humor",
  "industry_news",
  "other",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const TROPE_IDS = [
  "engagement_bait",
  "humblebrag",
  "parable",
  "truism",
  "hustle",
  "routine",
  "sales_pitch",
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
  /** Bullshit Index, integer 0..100. */
  index: number;
  category: CategoryId;
  /** Jev's confidence in the category (0..1). */
  categoryConfidence: number;
  signals: Signals;
  tropes: TropeId[];
  ai: AiVerdict;
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
