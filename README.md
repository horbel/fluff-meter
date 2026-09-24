<div align="center">

<img src="public/icon/128.png" width="88" alt="" />

# Fluff Meter

**Rates every LinkedIn post on a 0–100% Fluff Index.**

[![CI](https://github.com/horbel/fluff-meter/actions/workflows/ci.yml/badge.svg)](https://github.com/horbel/fluff-meter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/☕-buy%20me%20a%20coffee-ffdd00)](https://buymeacoffee.com/horbel)

<img src="docs/screenshot-fluff.png" width="430" alt="A motivational LinkedIn post by Chad Synergy, Chief Visionary Officer, scored 99%, Pure fluff" />
<img src="docs/screenshot-signal.png" width="430" alt="A technical LinkedIn post by Priya Raman, Staff Engineer, about fixing an N+1 query, scored 3%, Pure signal" />

<sub>The same feed, two posts: a janitor parable and a real fix with numbers.</sub>

</div>

Scroll LinkedIn as usual. Every post gets a small badge that tells you:

- **how much fluff it is**, from 🧠 *Pure signal* to ☁️ *Pure fluff*;
- **whether it reads like AI wrote it**;
- **what kind of post it is**: tech, hiring, career news, motivation, promo…;
- **which clichés it uses**: humblebrags, "Agree? 👇", janitor stories, one-line-per-sentence
  "broetry".

The popup shows how much of your feed was fluff today, this week or this month.

It rates posts, not people.

## Install

1. Download the zip from the [latest release](https://github.com/horbel/fluff-meter/releases/latest)
   and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the
   unzipped folder.
3. Open LinkedIn.

It starts in **demo mode** with random numbers, so you can see how it looks. For real scores,
click the extension icon and paste a [TypeSafe](https://console.typesafe.ai/keys) or
[OpenRouter](https://openrouter.ai/settings/keys) API key. $1 covers about 12,000 posts.

## Make it yours

<img src="docs/popup.png" width="300" align="right" alt="The extension popup" />

Every tag has a slider from 🏆 (fine by me) to ☁️ (pure fluff). Think event posts are
nonsense? Drag *Event* to ☁️. Or pick a preset: **Engineer**, **Recruiter** or **Pragmatist**.

## Privacy

No servers, no tracking. Without a key nothing leaves your browser. With a key, only the text of
the posts you scroll past goes to the AI provider you picked. [Details](PRIVACY.md).

<br clear="right" />

## For developers

- [How it works](docs/how-it-works.md): the model, the scoring and the code layout.
- [Contributing](CONTRIBUTING.md): setup, tests and where to fix things when LinkedIn changes.
- [Chrome Web Store listing](docs/chrome-web-store.md): texts and answers for publishing.

Scores come from [Jev](https://docs.typesafe.ai/concepts/system-one), a small, fast model by
TypeSafe that answers yes/no and multiple-choice questions instead of writing text.

## Support

If it made you laugh at your feed, [buy me a coffee ☕](https://buymeacoffee.com/horbel).

## License

[MIT](LICENSE). Not affiliated with LinkedIn or TypeSafe.
