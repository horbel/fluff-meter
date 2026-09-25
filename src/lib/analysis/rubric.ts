import { choice, noul, score } from "@typesafe-ai/sdk";
import { AI_QUESTIONS } from "./ai";
import type { CategoryId } from "./types";

/**
 * What Jev is asked about every post. All questions go out in one request: Jev reads the
 * post once and answers them in parallel, so extra questions cost input tokens, not latency.
 *
 * Style rules (from https://docs.typesafe.ai/model-jaggedness/jev-1.13):
 * - one narrow judgment per question, worded literally, no double negatives;
 * - Score levels describe concrete situations and stand on their own;
 * - counting and arithmetic stay in code (see heuristics.ts and scoring.ts).
 */

/** What the post is about, not how it is written. Neutral: no category is fluff by itself. */
const CATEGORY_CRITERIA = {
  know_how:
    "Practical knowledge: engineering, code, data, design, science or a how-to explained with real detail.",
  news: "News about a company, product or industry: a launch, release, funding, deal, result or trend.",
  opinion:
    "An opinion or hot take on an industry or the workplace, told as advice or a prediction.",
  stories:
    "A personal story, life lesson or motivational message, including 'what X taught me about Y'.",
  career_moves: "The author's own career update: new job, promotion, work anniversary, graduation.",
  hiring: "A job opening: the author or company is looking to hire someone.",
  job_hunt: "The author is looking for a job or new clients and asks for leads.",
  events:
    "An event: meetup, conference, webinar, talk, or networking, announced or recapped with photos.",
  promo: "An ad for a course, newsletter, service, product or the author's own offer.",
  humor: "A joke, meme or satire.",
  other: "None of the above fits.",
} satisfies Record<CategoryId, string>;

export const QUESTIONS = {
  category: choice("What kind of LinkedIn post is this?", CATEGORY_CRITERIA),

  buzzwords: score(
    "How much of the post is corporate buzzwords and jargon instead of plain words?",
    [
      "Plain, concrete language with no buzzwords.",
      "A few buzzwords, but the meaning is clear.",
      "Many buzzwords such as synergy, leverage, game-changer, disrupt, ecosystem.",
      "Almost entirely buzzwords; it is hard to say what the post actually means.",
    ],
  ),

  substance: score(
    "How much concrete, specific information does the post contain, such as numbers, names, steps, code, examples or verifiable facts?",
    [
      "None: only feelings, slogans or generic statements.",
      "A little: one or two specific details.",
      "Some: several concrete details a reader could use.",
      "A lot: dense with specific, useful information.",
    ],
  ),

  self_promotion: score("How much is the post about making the author look impressive?", [
    "Not at all: the post is about the topic, not the author.",
    "Slightly: the author mentions their own role or work in passing.",
    "Clearly: the post highlights the author's achievements or status.",
    "Entirely: the post exists to show off the author.",
  ]),

  engagement_bait: noul(
    "Does the post ask readers to like, comment, repost, follow, tag someone, or type a word in the comments?",
    {
      true: "It explicitly asks for a reaction, e.g. 'Agree?', 'Thoughts?', 'Repost to help', 'Comment GUIDE and I'll DM it to you'.",
      false: "It does not ask readers to react.",
    },
  ),

  humblebrag: noul(
    "Does the author mention their own achievement while presenting it as humility or gratitude?",
    {
      true: "e.g. 'Humbled to announce...', 'Thrilled and honored to share...', 'I never expected 10,000 followers...'.",
      false: "No achievement is dressed up as humility.",
    },
  ),

  parable: noul(
    "Does the post tell a dramatic, too-neat story that ends with a business or life lesson?",
    {
      true: "e.g. a janitor, a stranger, a child or a candidate the author almost rejected says one line that changes everything, followed by a moral.",
      false: "There is no story with a moral, or the story is specific and believable.",
    },
  ),

  truism: noul("Does the post present an obvious, widely known idea as a deep insight?", {
    true: "e.g. 'Your network is your net worth', 'Culture eats strategy for breakfast', 'Kindness is free'.",
    false: "The main idea is not an obvious cliché.",
  }),

  hustle: noul(
    "Does the post praise overwork, such as working very long hours, waking up at 4am or sacrificing personal life for work?",
  ),

  ...AI_QUESTIONS,

  sensitive: noul(
    "Is the post mainly about death, war, serious illness, a disaster or another personal tragedy?",
    {
      true: "e.g. a loss in the family, a colleague who died, life under war, a diagnosis.",
      false: "It is about something else, even if it mentions hard times in passing.",
    },
  ),
} as const;

export type Questions = typeof QUESTIONS;

/** A reader can add this many topics of their own; each one is one more yes/no question. */
export const MAX_TOPICS = 3;
export const MAX_TOPIC_CHARS = 40;

/** Topic labels as they go to the model: trimmed, capped, no empties or duplicates. */
export function cleanTopics(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.replace(/\s+/g, " ").trim().slice(0, MAX_TOPIC_CHARS);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
  }
  return out.slice(0, MAX_TOPICS);
}

/** One question per topic, keyed `topic_0`, `topic_1`… in the order given. */
export function topicQuestions(labels: readonly string[]) {
  return Object.fromEntries(
    labels.map((label, i) => [
      `topic_${i}`,
      noul(`Is this post mainly about ${JSON.stringify(label)}?`, {
        true: `The post is mostly about ${label}, or ${label} is central to it.`,
        false: `${label} is not the subject, or it is only mentioned in passing.`,
      }),
    ]),
  );
}
