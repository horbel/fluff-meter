# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste.

## Store listing

**Name:** Fluff Meter for LinkedIn
(set as `name` in `wxt.config.ts`; the store shows the manifest name)

**Summary** (132 characters max):
Rates LinkedIn posts by how much is fluff, tags clichés and good signs, and folds what you don't want to read.

**Description** (plain text; the same text is in `store-upload/description.txt` locally):

> Fluff Meter rates every LinkedIn post by how much of it is empty words instead of facts, and folds the ones you don't want to read.
>
> ON EVERY POST
> • A Fluff Index from 0 to 100%. Nothing concrete and corporate jargon push it up. It's the only number.
> • Clichés, in orange: engagement bait, humblebrag, too-neat fables, truisms, hustle, broetry, reads like AI.
> • Good signs, in green: real numbers, a real take backed by facts, a mistake the author owns.
> • What the post is about: know-how, news, hiring, career moves, promo and more.
> Click any chip to see what it means, with an example.
>
> FOLD WHAT YOU DON'T WANT
> Pure fluff folds into one line, and one click opens it again. Two short lists do the rest:
> • Fold: too much fluff, categories you skip (promo, events…), clichés you can't stand, topics of your own like "crypto".
> • Always show: categories you want, topics like "Rust", posts with a good sign.
> Make a rule right from a post: click a chip and pick Fold or Always show. Or start from a preset: Engineer, Recruiter or Job seeker.
>
> YOUR FEED IN NUMBERS
> The popup shows how much of your feed was fluff today, this week or this month, the top clichés and how many posts it folded for you.
>
> HOW IT WORKS
> Scores come from Jev by TypeSafe, a fast model built for rating text: one call per post, about 10,000 posts for a dollar. It starts in demo mode with random numbers; add your own TypeSafe or OpenRouter key for real scores. It reads the text only, not images. Posts about a loss, a war or an illness never get a score.
>
> PRIVACY
> No servers, no account, no analytics. Your key, settings and stats stay on your device. Only the text of the posts you scroll past, and your own topics, go to the AI provider you picked.
>
> Open source: https://github.com/horbel/fluff-meter
> It rates posts, not people. Not affiliated with LinkedIn or TypeSafe.

**Category:** Social & Communication
**Language:** English

**Assets** (all in [`store/`](../store)):
- Icon: `icon-128.png`
- Screenshots, 1280×800: `screenshot-1.png` (a feed with folded posts), `screenshot-2.png` (fluff
  vs substance), `screenshot-3.png` (a chip's card: fold posts like this), `screenshot-4.png` (the
  Fold and Always show rules), `screenshot-5.png` (feed stats)
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
