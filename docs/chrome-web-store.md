# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste.

## Store listing

**Name:** Fluff Meter for LinkedIn
(set as `name` in `wxt.config.ts`; the store shows the manifest name)

**Summary** (132 characters max):
Rates LinkedIn posts on a 0–100% Fluff Index, names the clichés and folds what you don't want to read.

**Description:**

> Scroll LinkedIn as usual. Every post gets a small badge: how much fluff it is, which clichés it
> leans on (engagement bait, humblebrags, too-neat fables, broetry) and what it is about.
>
> Pure fluff folds into one line, so you skip it in a second. One click opens it again.
>
> Make it yours: star the categories you want (know-how, hiring, news…) and fold the ones you
> don't (promo, career moves, events…), or pick a preset: Engineer, Recruiter or Job seeker. Add
> topics of your own, like "Rust" or "crypto", to star or fold them too.
>
> Posts about a loss, a war or an illness never get a score.
>
> Scores come from Jev by TypeSafe, a fast model built for rating text: one quick call per post,
> about 12,000 posts for a dollar.
>
> It starts in demo mode with random numbers. For real scores, add your own TypeSafe or OpenRouter
> API key. No servers, no tracking: only the text of the posts you scroll past goes to the AI
> provider you picked.
>
> Open source: https://github.com/horbel/fluff-meter
>
> It rates posts, not people. Not affiliated with LinkedIn or TypeSafe.

**Category:** Social & Communication
**Language:** English

**Assets** (all in [`store/`](../store)):
- Icon: `icon-128.png`
- Screenshots, 1280×800: `screenshot-1.png` (fluff vs substance), `screenshot-2.png` (folded
  posts), `screenshot-3.png` (categories and presets), `screenshot-4.png` (the breakdown),
  `screenshot-5.png` (feed stats)
- Small promo tile, 440×280: `promo-small-440x280.png`
- Marquee, 1400×560: `marquee-1400x560.png`

## Privacy tab

**Single purpose:** Show a Fluff Index and short labels on LinkedIn posts, and fold the ones the
user doesn't want to see.

**Permission justifications:**
- `storage`: saves the user's settings, API key and scores on their device.
- Host `https://api.typesafe.ai/*`, `https://openrouter.ai/*`: sends post text to the AI provider
  whose key the user entered, to score it.
- Content script on `https://www.linkedin.com/*`: reads post text and draws the badges.

**Remote code:** No. All code ships in the package.

**Data usage:** Website content (the text of LinkedIn posts) is sent to the AI provider the user
chose, only to compute the scores. No personal data, no analytics, no selling or transfer for any
other purpose.

**Privacy policy URL:** https://github.com/horbel/fluff-meter/blob/master/PRIVACY.md

## Publishing

1. Register at https://chrome.google.com/webstore/devconsole (one-time $5 fee).
2. `npm run zip`, then upload `.output/fluff-meter-<version>-chrome.zip`.
3. Fill in the sections above and submit for review.
