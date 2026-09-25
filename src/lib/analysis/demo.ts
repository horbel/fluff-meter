import { hashText, seededRandom } from "../hash";
import { formattingSignal, textStats } from "./heuristics";
import { buildAnalysis } from "./scoring";
import { AI_TELL_IDS, type Analysis, CATEGORY_IDS, type PostInput, type Signals } from "./types";

/**
 * Demo mode: no API key, no network. Numbers are random, but seeded by the post text so a
 * post keeps the same badge when you scroll back to it. The UI labels every demo badge.
 */
export function demoAnalysis(post: PostInput, topics: readonly string[] = []): Analysis {
  const text = post.reshared ? `${post.text}\n\n${post.reshared}` : post.text;
  const rand = seededRandom(Number.parseInt(hashText(text, 7).slice(-8), 36));
  // A "mood" per post makes the fake signals move together, so the index spreads 0..100
  // instead of every post landing near 50.
  const mood = rand();
  const signal = () => Math.min(1, Math.max(0, mood + (rand() - 0.5) * 0.6));
  // Nouls are yes/no in spirit, so push them towards 0 or 1.
  const noul = () => (rand() < mood * 0.8 ? 0.6 + rand() * 0.4 : rand() * 0.4);
  const stats = textStats(text);
  const signals: Omit<Signals, "ai"> = {
    buzzwords: signal(),
    fluff: signal(),
    self_promotion: signal(),
    engagement_bait: noul(),
    humblebrag: noul(),
    parable: noul(),
    truism: noul(),
    hustle: noul(),
    formatting: formattingSignal(stats),
  };
  const category = CATEGORY_IDS[Math.floor(rand() * CATEGORY_IDS.length)] ?? "other";
  const aiLikelihood = rand();
  const tells = AI_TELL_IDS.filter(() => rand() < aiLikelihood * 0.5);
  return buildAnalysis({
    signals,
    ai: { likelihood: aiLikelihood, tells },
    stats,
    category,
    categoryConfidence: rand(),
    // Never random: a demo badge must not go quiet on a post for no visible reason.
    sensitive: 0,
    topics: Object.fromEntries(topics.map((label) => [label, rand() < 0.15 ? 0.9 : 0.05])),
    source: "demo",
  });
}
