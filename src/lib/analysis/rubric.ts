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

const CATEGORY_CRITERIA = {
  motivational:
    "Motivational or inspirational message: mindset, success, never give up, life lessons.",
  technical:
    "Technical content: engineering, code, data, design or science explained with real detail.",
  career_news: "The author's own career update: new job, promotion, work anniversary, graduation.",
  hiring: "A job opening: the author or company is looking to hire someone.",
  job_seeking: "The author is looking for a job or new clients and asks for leads.",
  event:
    "An event: meetup, conference, webinar, talk, or networking, announced or recapped with photos.",
  company_news: "Company or product news: launch, release, funding, partnership, milestone.",
  hot_take: "An opinion or hot take on an industry trend, told as advice or a prediction.",
  personal_story: "A personal story from the author's life or work, without a job update.",
  promo: "An ad for a course, newsletter, service, product or the author's own offer.",
  humor: "A joke, meme or satire.",
  industry_news: "News or analysis of something that happened in an industry or the economy.",
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
    "Does the post ask readers to like, comment, repost, follow, or type a word in the comments?",
    {
      true: "It explicitly asks for a reaction, e.g. 'Agree?', 'Thoughts?', 'Comment YES', 'Repost to help'.",
      false: "It does not ask readers to react.",
    },
  ),

  humblebrag: noul(
    "Does the author mention their own achievement while presenting it as humility or gratitude?",
    {
      true: "e.g. 'Humbled to announce...', 'I never expected 10,000 followers...'.",
      false: "No achievement is dressed up as humility.",
    },
  ),

  parable: noul(
    "Does the post tell a dramatic short story that ends with a business or life lesson?",
    {
      true: "e.g. a story about a stranger, a child, a janitor, a job interview or getting fired, followed by a moral.",
      false: "There is no story with a moral at the end.",
    },
  ),

  truism: noul("Does the post present an obvious, widely known idea as a deep insight?", {
    true: "e.g. 'Your network is your net worth', 'Culture eats strategy for breakfast', 'Kindness is free'.",
    false: "The main idea is not an obvious cliché.",
  }),

  routine: noul(
    "Is this a routine personal update that mostly matters to the author's friends and colleagues, such as a new job, promotion, work anniversary, certificate, thanks to a team, or attending an event?",
    {
      true: "Routine: an ordinary job change, anniversary, certificate, thank-you or event photo.",
      false:
        "Not routine: the post shares ideas or real news, or the person or move is notable to a wide audience, e.g. a famous researcher joining a major AI lab.",
    },
  ),

  hustle: noul(
    "Does the post praise overwork, such as working very long hours, waking up at 4am or sacrificing personal life for work?",
  ),

  ...AI_QUESTIONS,

  sales_pitch: noul(
    "Does the post try to sell a product, course, service or newsletter, or ask readers to DM the author, book a call or sign up?",
    {
      true: "The author is selling something or collecting leads.",
      false: "Nothing is for sale. A job opening or an event invite is not a sales pitch.",
    },
  ),
} as const;

export type Questions = typeof QUESTIONS;
