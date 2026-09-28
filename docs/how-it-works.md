# How it works

Fluff Meter is a Manifest V3 extension built with [WXT](https://wxt.dev) and TypeScript.
This page is for people who want to know what happens under the hood, or change it.

## Scoring

Scores come from [**Jev**](https://docs.typesafe.ai/concepts/system-one), TypeSafe's "System One"
model. Jev doesn't generate text: it answers typed questions (yes/no, pick one, rate on a rubric)
with calibrated probabilities. That makes it a good fit here: fast, cheap and it can't hallucinate
a paragraph of snark.

For each post the extension sends **one request** with nineteen questions, plus one per topic
the reader added ([`rubric.ts`](../src/lib/analysis/rubric.ts), [`ai.ts`](../src/lib/analysis/ai.ts)):

| Question type | Asked about |
| --- | --- |
| Choice | Which category is this post? |
| Score (4 levels) | Buzzwords · concrete substance · reads like AI overall |
| Noul (yes/no), clichés | Engagement bait · humblebrag · fable · truism · hustle |
| Noul (yes/no), AI tells | AI vocabulary · "not X, but Y" · rule of three · punchy fragments · fake candor · human details |
| Noul (yes/no), good signs | Real data or results · a debatable position backed by facts · a mistake the author owns |
| Noul (yes/no) | Is it about a loss, a war or an illness? |
| Noul (yes/no), per topic | Is this post mainly about "Rust"? |

The AI tells follow Wikipedia's
[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing): no single tell
proves anything, several together are evidence, and real human detail (names, numbers, jokes, mixed
feelings) lowers the score. No AI detector is reliable, so the chip only ever says what a post
*reads like*.

Formatting (broetry, emoji bullets, hashtag walls, em dashes, 𝗯𝗼𝗹𝗱 Unicode letters, arrows) is
measured in code, because models are bad at counting. On LinkedIn a spaced em dash is a strong
tell, so it counts even when the rest of the post sounds human.

## One number, the rest are tags

The badge answers separate questions, and they never mix:

- **How much is empty words?** The Fluff Index, the only number.
  [`scoring.ts`](../src/lib/analysis/scoring.ts) takes two answers: how little concrete
  information the post has (numbers, names, steps, examples) and how much of it is buzzwords, 70/30.
  An S-curve spreads the middle so a real feed uses the whole scale. It is the same for everyone.
- **How is it written?** Clichés (bait, humblebrag, fable, truism, hustle, broetry) and the AI
  guess. Tags only: they never change the number, so a solid post with one "humbled to share"
  stays solid and gets a 🙏 chip. The reader can fold every post that has a given cliché (off by
  default) or hide cliché chips altogether.
- **Is there something good?** Good signs, the opposite of clichés: 📊 Real numbers,
  🥊 Real take (a position you could argue with, backed by facts) and 🌿 Owns a mistake. Their
  questions were tuned on 39 posts full of near-misses (hot takes without reasons, humblebrag
  "failures", "lessons learned" with no mistake): 38 or 39 answered right. Steps and
  instructions are the Know-how category, not a good sign. A post with a good sign never folds for
  fluff, and by default it always shows.
- **What is it about?** The category, and the reader's own topics. Neutral until the reader
  decides.

The reader's choices are two lists of rules ([`rules.ts`](../src/lib/rules.ts),
[`personal.ts`](../src/lib/personal.ts)):

- **🙈 Fold**: too much fluff (Pure fluff by default, or Fluffy too), a category, a topic of
  their own, a cliché. A folded post shrinks to one line with the reason and a Show button.
- **⭐ Always show**: a category, a topic, a good sign. Such a post gets a star and never folds.
  Always show wins over Fold; a topic the reader folds wins over both.

Rules are made in the popup ("+ Add") or right on a post: every chip opens a card with what it
means, an example and a Fold / Show / Always show switch. Any post in the feed can also be folded
by hand. Posts about a loss, a war or an illness get no badge at all and are never folded.

A repost is sent as two texts, the author's comment and the reshared post, so a one-line comment
on a long post is judged on both. Images and videos are not analyzed.

Chips show words, not numbers: the Fluff Index is the one number on a badge. How sure Jev is about
each chip is on its card and in the breakdown.

On the sample posts in [`tests/fixtures`](../tests/fixtures/sample-posts.ts) that gives:

| Post | Index | Category | Clichés |
| --- | --- | --- | --- |
| "In today's fast-paced world, leveraging synergies…" | 100% Pure fluff · 🤖 92% | Other | Truism |
| "𝗔𝗜 𝘄𝗼𝗻'𝘁 𝗿𝗲𝗽𝗹𝗮𝗰𝗲 𝘆𝗼𝘂. Here's the thing -…" | 99% Pure fluff · 🤖 99% | Opinion | Bait, Truism, Broetry |
| "I proposed to my girlfriend… what it taught me about B2B sales" | 88% Pure fluff | Stories & lessons | Truism, Bait, Fable |
| "I got rejected from 47 jobs. Then a janitor told me…" | 74% Fluffy | Stories & lessons | Bait, Humblebrag, Fable, Truism, Hustle |
| "Comment GROWTH and I'll send you the playbook" | 69% Fluffy | Promo | Bait |
| "Starting a new position as Senior QA at Globex!" | 28% Solid | Career moves | |
| "Last week we lost our colleague Tomasz…" | no badge | | |
| Meetup recap with a link to slides | 20% Solid | Events | |
| "What a night! Huge thanks to Anna, Piotr and Marta…" | 18% Solid | Thank-yous | |
| "After nine years at DeepMind… I'm joining Anthropic" | 16% Solid | Career moves | |
| "ok so the coffee machine has been broken for 3 weeks…" | 16% Solid | Stories & lessons | |
| "We cut our CI time from 18 to 6 minutes. What helped…" | 1% Solid | Know-how | |
| Job opening with stack and salary | 1% Solid | Hiring | |

The janitor post is the one to look at: it names numbers and people, so it isn't the emptiest post
here, and its five cliché chips say the rest.

Posts are scored only when they scroll near the viewport, each at most once, and results are cached
locally. A post costs about 2,250 input tokens, which at Jev's
[$0.042 per million](https://docs.typesafe.ai/models) is about **10,000 posts per dollar**.

Posts by the author of this extension get a ✨ Legend chip
([`easter-egg.ts`](../src/lib/analysis/easter-egg.ts)). They are scored like everyone else's.

## Keys and providers

Click the extension icon and paste a key. Either kind works; the extension tells them apart:

| Provider | Where to get a key | Looks like |
| --- | --- | --- |
| TypeSafe (direct) | [console.typesafe.ai/keys](https://console.typesafe.ai/keys) | anything else |
| OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) | `sk-or-…` |

Both go to the same `POST /v1/systemone` endpoint through TypeSafe's official
[`@typesafe-ai/sdk`](https://www.npmjs.com/package/@typesafe-ai/sdk), which handles retries and
rate limits. The model is `jev-latest`, so new Jev releases are picked up without an update.

## Development

```sh
nvm use && npm install
npm run dev        # Chrome with the extension and hot reload
npm run build      # production build in .output/chrome-mv3
npm run zip        # store-ready zip
npm run check      # typecheck + lint + tests
npm run smoke      # live API test, needs a key in .env (see .env.example)
```

Built with [WXT](https://wxt.dev), TypeScript, [Biome](https://biomejs.dev) and
[Vitest](https://vitest.dev). No UI framework: the badge is a few DOM nodes in a closed shadow root.

```
src/
├── entrypoints/
│   ├── background.ts          # the only place that holds the key and calls the API
│   ├── linkedin.content.ts    # finds posts, draws badges
│   └── popup/                 # key, on/off switch, feed report, Fold / Always show rules
└── lib/
    ├── analysis/
    │   ├── rubric.ts          # the questions Jev answers
    │   ├── scoring.ts         # signals → Fluff Index, tropes
    │   ├── heuristics.ts      # what code measures itself (broetry, emoji, hashtags)
    │   ├── jev.ts             # SDK client, response validation, error mapping
    │   ├── demo.ts            # seeded random results for demo mode
    │   └── labels.ts          # every user-facing label and emoji
    ├── linkedin/
    │   ├── selectors.ts       # every LinkedIn DOM assumption, in one file
    │   └── extract.ts         # post text, reposts, where the badge goes
    ├── personal.ts            # the reader's view of a post: what folds, what gets a star
    ├── rules.ts               # Fold / Always show rules: list, add, remove, describe
    ├── presets.ts             # Default, Engineer, Recruiter, Job seeker
    └── ui/badge.ts            # the badge, chip cards and the fold bar
```

**LinkedIn changed its markup and badges are gone?** Everything DOM-related is in
[`selectors.ts`](../src/lib/linkedin/selectors.ts), with a matching test fixture. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
