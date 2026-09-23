/**
 * Things code can measure exactly. Jev is not a counter, so formatting signals are computed
 * here and only the semantic judgments go to the model.
 */

export interface TextStats {
  chars: number;
  paragraphs: number;
  /** Average paragraph length in characters. */
  avgParagraph: number;
  emojis: number;
  hashtags: number;
}

const EMOJI = /\p{Extended_Pictographic}/gu;
const HASHTAG = /(?:^|\s)#[\p{L}\p{N}_]+/gu;

export function textStats(text: string): TextStats {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chars = text.trim().length;
  return {
    chars,
    paragraphs: paragraphs.length,
    avgParagraph: paragraphs.length ? chars / paragraphs.length : 0,
    emojis: text.match(EMOJI)?.length ?? 0,
    hashtags: text.match(HASHTAG)?.length ?? 0,
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * "Broetry": one short sentence per line, repeated until the reader clicks "…more".
 * 0 for normal prose, 1 for a post that is mostly one-liners.
 */
export function broetry(s: TextStats): number {
  if (s.paragraphs < 6) return 0;
  const manyLines = clamp01((s.paragraphs - 5) / 10);
  const shortLines = clamp01((120 - s.avgParagraph) / 80);
  return manyLines * shortLines;
}

/** Emoji bullets, hashtag walls and broetry combined into one 0..1 signal. */
export function formattingSignal(s: TextStats): number {
  const emojiPer100 = s.chars ? (s.emojis / s.chars) * 100 : 0;
  return clamp01(
    0.5 * broetry(s) + 0.3 * clamp01(emojiPer100 / 1.5) + 0.2 * clamp01((s.hashtags - 3) / 7),
  );
}
