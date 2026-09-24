import { buildAnalysis } from "./scoring";
import { type Analysis, SIGNAL_IDS, type Signals } from "./types";

/**
 * 🥚 The zero-fluff list. Posts by these profiles skip the model entirely: whatever they
 * write is, by definition, pure signal.
 *
 * Ids are the part of the profile URL after linkedin.com: `in:<slug>` for people,
 * `company:<slug>` for pages. Lowercase.
 */
export const ZERO_FLUFF_AUTHORS: ReadonlySet<string> = new Set([
  "in:aliaksei-horbel-5b42a1113", // the author of this extension, obviously
]);

export function isZeroFluff(author: string | undefined): boolean {
  return !!author && ZERO_FLUFF_AUTHORS.has(author.toLowerCase());
}

export function legendAnalysis(): Analysis {
  const signals = Object.fromEntries(
    SIGNAL_IDS.filter((id) => id !== "ai").map((id) => [id, 0]),
  ) as Omit<Signals, "ai">;
  return buildAnalysis({
    signals,
    ai: { likelihood: 0, tells: [] },
    stats: { chars: 0, paragraphs: 0, avgParagraph: 0, emojis: 0, hashtags: 0 },
    category: "other",
    categoryConfidence: 1,
    source: "legend",
  });
}
