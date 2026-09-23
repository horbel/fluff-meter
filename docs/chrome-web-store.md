# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste.

## Store listing

**Name:** Bullshit Detector
(fallback if the name is rejected: *BS Detector — Bullshit Index for LinkedIn*)

**Summary** (132 characters max):
Rates every LinkedIn post on a 0–100% Bullshit Index, spots AI-written posts and names the clichés.

**Description:**

> Scroll LinkedIn as usual. Every post gets a small badge that tells you how much bullshit it is,
> whether it reads like AI wrote it, what kind of post it is and which clichés it uses:
> humblebrags, "Agree? 👇", janitor stories, one-line-per-sentence "broetry".
>
> The popup shows how much of your feed was bullshit today, this week or this month. Slide any tag
> from 🏆 to 🐂 to make the score your own, or pick a preset: Engineer, Recruiter or Pragmatist.
>
> It starts in demo mode with random numbers. For real scores, add your own TypeSafe or OpenRouter
> API key. No servers, no tracking: only the text of the posts you scroll past goes to the AI
> provider you picked.
>
> Open source: https://github.com/horbel/bullshit-detector
>
> It rates posts, not people. Not affiliated with LinkedIn or TypeSafe.

**Category:** Social & Communication
**Language:** English

**Assets:**
- Icon: `public/icon/128.png`
- Screenshots (1280×800 or 640×400): a feed with badges, the popup, the breakdown.
- Small promo tile (440×280), optional.

## Privacy tab

**Single purpose:** Show a Bullshit Index and short labels on LinkedIn posts.

**Permission justifications:**
- `storage`: saves the user's settings, API key and scores on their device.
- Host `https://api.typesafe.ai/*`, `https://openrouter.ai/*`: sends post text to the AI provider
  whose key the user entered, to score it.
- Content script on `https://www.linkedin.com/*`: reads post text and draws the badges.

**Remote code:** No. All code ships in the package.

**Data usage:** Website content (the text of LinkedIn posts) is sent to the AI provider the user
chose, only to compute the scores. No personal data, no analytics, no selling or transfer for any
other purpose.

**Privacy policy URL:** https://github.com/horbel/bullshit-detector/blob/master/PRIVACY.md

## Publishing

1. Register at https://chrome.google.com/webstore/devconsole (one-time $5 fee).
2. `npm run zip`, then upload `.output/bullshit-detector-<version>-chrome.zip`.
3. Fill in the sections above and submit for review.
