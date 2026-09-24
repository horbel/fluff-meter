# How it works

Fluff Meter is a Manifest V3 extension built with [WXT](https://wxt.dev) and TypeScript.
This page is for people who want to know what happens under the hood, or change it.

## Scoring

Scores come from [**Jev**](https://docs.typesafe.ai/concepts/system-one), TypeSafe's "System One"
model. Jev doesn't generate text: it answers typed questions (yes/no, pick one, rate on a rubric)
with calibrated probabilities. That makes it a good fit here: fast, cheap and it can't hallucinate
a paragraph of snark.

For each post the extension sends **one request** with eighteen questions
([`rubric.ts`](../src/lib/analysis/rubric.ts), [`ai.ts`](../src/lib/analysis/ai.ts)):

| Question type | Asked about |
| --- | --- |
| Choice | Which genre is this post? |
| Score (4 levels) | Buzzwords · concrete substance · self-promotion · reads like AI overall |
| Noul (yes/no) | Engagement bait · humblebrag · parable · truism · hustle · routine update · sales pitch |
| Noul (yes/no), AI tells | AI vocabulary · "not X, but Y" · rule of three · punchy fragments · fake candor · human details |

The AI tells follow Wikipedia's
[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing): no single tell
proves anything, several together are evidence, and real human detail (names, numbers, jokes, mixed
feelings) lowers the score. No AI detector is reliable, so the chip only ever says what a post
*reads like*.

Formatting (broetry, emoji bullets, hashtag walls, em dashes, 𝗯𝗼𝗹𝗱 Unicode letters, arrows) is
measured in code, because models are bad at counting. On LinkedIn a spaced em dash is a strong
tell, so it counts even when the rest of the post sounds human.

Then [`scoring.ts`](../src/lib/analysis/scoring.ts) combines the answers: empty language (buzzwords,
no substance, self-promo) sets a base, each trope independently pushes the rest of the way towards
100, and an S-curve spreads the middle so a real feed uses the whole scale instead of sitting at
35–55%. All of it is plain numbers in code, retunable without a new model call.

On the sample posts in [`tests/fixtures`](../tests/fixtures/sample-posts.ts) that gives:

| Post | Index | AI |
| --- | --- | --- |
| "I got rejected from 47 jobs. Then a janitor told me…" | 99% ☁️ Pure fluff | 🤔 62% |
| "𝗔𝗜 𝘄𝗼𝗻'𝘁 𝗿𝗲𝗽𝗹𝗮𝗰𝗲 𝘆𝗼𝘂. Here's the thing —…" | 97% ☁️ Pure fluff | 🤖 99% |
| "In today's fast-paced world, leveraging synergies…" | 96% ☁️ Pure fluff | 🤖 92% |
| "Starting a new position as Senior QA at Globex! Thanks to everyone…" | 77% 🎈 Very fluffy | ✍️ 22% |
| Meetup recap with a link to slides | 63% 🧁 Fluffy | ✍️ 5% |
| "ok so the coffee machine has been broken for 3 weeks…" | 41% 🍃 A bit fluffy | ✍️ 1% |
| "After nine years at DeepMind leading AlphaFold 3, I'm joining Anthropic…" | 18% 👍 Mostly solid | ✍️ 9% |
| Job opening with stack and salary | 3% 🧠 Pure signal | ✍️ 28% |
| "We cut our CI time from 18 to 6 minutes. What helped…" | 2% 🧠 Pure signal | ✍️ 2% |

Posts are scored only when they scroll near the viewport, each at most once, and results are cached
locally. A post costs about 1,950 input tokens, which at Jev's
[$0.042 per million](https://docs.typesafe.ai/models) is about **12,000 posts per dollar**.

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
│   └── popup/                 # key, on/off switch, feed report
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
    ├── presets.ts             # Default, Engineer, Recruiter, Pragmatist
    └── ui/badge.ts            # the badge
```

**LinkedIn changed its markup and badges are gone?** Everything DOM-related is in
[`selectors.ts`](../src/lib/linkedin/selectors.ts), with a matching test fixture. See
[CONTRIBUTING.md](../CONTRIBUTING.md).
