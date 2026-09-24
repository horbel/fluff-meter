# Contributing

Thanks for helping! Bug reports, rubric tweaks and fixes for LinkedIn markup changes are all welcome.

## Setup

```sh
nvm use          # Node 22
npm install
npm run dev      # opens Chrome with the extension loaded and hot reload
```

`npm run dev` starts a fresh Chrome profile, so you'll need to log in to LinkedIn there once.
Alternatively run `npm run build` and load `.output/chrome-mv3` as an unpacked extension in
`chrome://extensions` (Developer mode on).

Before opening a PR:

```sh
npm run check    # typecheck + lint + unit tests
```

## Common changes

**Badges disappeared after a LinkedIn update.** All DOM assumptions are in
[`src/lib/linkedin/selectors.ts`](src/lib/linkedin/selectors.ts). Update the selectors, then update
the fixture in [`tests/fixtures/feed.html`](tests/fixtures/feed.html) so the test describes the new
markup. Please don't paste real people's posts into fixtures; use made-up text.

**The index feels too harsh or too soft.** Change `CORE_WEIGHTS`, `CORE_SHARE`, `TROPE_WEIGHTS`
(the sliders' defaults), the contrast curve or the thresholds in
[`src/lib/analysis/scoring.ts`](src/lib/analysis/scoring.ts). None of them need new model calls.

**The AI detector.** Questions, typography checks and weights are all in
[`src/lib/analysis/ai.ts`](src/lib/analysis/ai.ts). Mind false positives: polished writing, one em
dash or a non-native writer's plain English are not evidence on their own.

**A new question or category.** Edit [`src/lib/analysis/rubric.ts`](src/lib/analysis/rubric.ts),
add the signal to `types.ts`, `scoring.ts` and `labels.ts`, and bump `RUBRIC_VERSION` in
[`src/lib/analysis/version.ts`](src/lib/analysis/version.ts) so old cached scores are dropped.
Read TypeSafe's guidance on [writing questions](https://docs.typesafe.ai/primitives) and
[known limits](https://docs.typesafe.ai/model-jaggedness/jev-1.13) first: one narrow judgment per
question, literal wording, and no counting or arithmetic (do that in code).

Check the effect on real output with the live smoke test, which prints every signal for a set of
sample posts, plus the average token count:

```sh
cp .env.example .env   # add TYPESAFE_API_KEY or OPENROUTER_API_KEY
npm run smoke
```

## Tone

The joke is on LinkedIn-speak, not on people. Labels describe the post ("Humblebrag", "Bait"),
never the author, and stay one or two words long. Please keep it that way.
