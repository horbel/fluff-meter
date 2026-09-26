# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste.

## Store listing

**Name:** Fluff Meter for LinkedIn
(set as `name` in `wxt.config.ts`; the store shows the manifest name)

**Summary** (132 characters max):
Rates LinkedIn posts on a 0-100% Fluff Index, names the clichés and folds what you don't want to read.

**Description:**

> Scroll LinkedIn as usual. Every post gets a small badge: how much fluff it is, which clichés it
> leans on (engagement bait, humblebrags, too-neat fables, truisms, broetry) and what it is about.
> Posts that share real data or results get a 📊 Real numbers chip.
>
> Pure fluff folds into one line, so you skip it in a second. Click the line to open it again, or
> fold any post yourself.
>
> Make it yours: star the categories you want (know-how, hiring, news…) and fold the ones you
> don't (promo, career moves, events…), or pick a preset: Engineer, Recruiter or Job seeker. Add
> topics of your own, like "Rust" or "crypto", to star or fold them too. Switch off any cliché you
> don't mind.
>
> The popup shows how much of your feed was fluff today, this week or this month, and how many
> posts it folded for you.
>
> Posts about a loss, a war or an illness never get a score. It reads the text only, not images.
>
> Scores come from Jev by TypeSafe, a fast model built for rating text: one quick call per post,
> about 12,000 posts for a dollar.
>
> It starts in demo mode with random numbers. For real scores, add your own TypeSafe or OpenRouter
> API key.
>
> Collects no data: no servers, no account, no analytics. Your key, settings and stats stay on
> your device. Only the text of the posts you scroll past, and your topics if you added any, goes
> to the AI provider you picked.
>
> Open source: https://github.com/horbel/fluff-meter
>
> It rates posts, not people. Not affiliated with LinkedIn or TypeSafe.

**Category:** Social & Communication
**Language:** English

**Assets** (all in [`store/`](../store)):
- Icon: `icon-128.png`
- Screenshots, 1280×800: `screenshot-1.png` (a feed with folded posts), `screenshot-2.png` (fluff
  vs substance), `screenshot-3.png` (categories and presets), `screenshot-4.png` (the breakdown),
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

Live listing: https://chromewebstore.google.com/detail/fluff-meter-for-linkedin/ijfddippbjffofanjhmnfikabkkeeckj

To ship an update:

1. Bump the version in `package.json`, add a CHANGELOG entry and push a `vX.Y.Z` tag: the Release
   workflow runs the checks, builds the zip and attaches it to a GitHub release.
2. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), open Fluff Meter,
   go to **Package** and upload `.output/fluff-meter-<version>-chrome.zip` (or the zip from the
   release).
3. If the screenshots, texts or permissions changed, update **Store listing** and **Privacy**
   from this page and `store/`.
4. Submit for review.

Automatic updates: after every successful Release, the "Chrome Web Store" workflow uploads the
zip and submits it for review, once the `CHROME_PUBLISHER_ID`,
`CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` and `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` repository secrets
are set. It can also be run by hand for any tag. Listing texts and screenshots stay manual.

The listing page can report visits to a Google Analytics property (Store listing → Google
Analytics ID). That tracks people viewing the store page, not the extension: the extension itself
still collects nothing.
