<div align="center">

<img src="src/assets/icon.svg" width="88" alt="" />

# Fluff Meter

**Rates every LinkedIn post on a 0-100% Fluff Index and folds what you don't want to read.**

**[Add to Chrome](https://chromewebstore.google.com/detail/fluff-meter-for-linkedin/ijfddippbjffofanjhmnfikabkkeeckj)** · free · open source · collects nothing

[![CI](https://github.com/horbel/fluff-meter/actions/workflows/ci.yml/badge.svg)](https://github.com/horbel/fluff-meter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Buy me a coffee](https://img.shields.io/badge/☕-buy%20me%20a%20coffee-ffdd00)](https://buymeacoffee.com/horbel)

<img src="docs/screenshot.png" width="860" alt="A LinkedIn feed with Fluff Meter: a latency fix scored 3% Solid with a starred Know-how chip and green Real numbers and Real take chips, and four posts folded to one line each: 99% Pure fluff, a Promo post, a post about crypto and a post with engagement bait" />

<sub>A feed with Fluff Meter on: the fix with real numbers stays open; fluff, promo, crypto and bait fold to one line each. Every post and person but the author's own profile is made up.</sub>

</div>

Scroll LinkedIn as usual. Every post gets a small badge that tells you:

- **how much fluff it is**, from ☀️ *Solid* to ☁️ *Pure fluff*: how much of the post is empty
  words instead of facts. This is the only number;
- **which clichés it leans on**: engagement bait ("Agree? 👇", "comment GUIDE"), humblebrags,
  too-neat fables with a janitor in them, truisms, hustle, broetry, AI style. Tags only: a solid
  post with one "humbled to share" stays solid;
- **good signs**: 📊 real numbers, 🥊 a real take backed by facts, 🌿 a mistake the author
  owns. Posts with one never fold for fluff;
- **what it is about**: know-how, news, hiring, career moves, thank-yous, events, promo…

Pure fluff folds into one line, so you skip it in a second. Click the line to open it again, or
fold any post yourself with **Fold**. The popup shows how much of your feed was fluff and how many
posts it folded for you.

It reads the text of a post, and of the post it reshares. Images, videos and the text inside them
are not analyzed.

Posts about a loss, a war or an illness never get a score. It rates posts, not people.

> [!IMPORTANT]
> **Real scores need an API key** from [TypeSafe](https://console.typesafe.ai/keys) or
> [OpenRouter](https://openrouter.ai/settings/keys). Without one, Fluff Meter runs in **demo
> mode**: every badge shows random numbers, just to show what it looks like. See
> [API key](#api-key-required).

## Install

**[Get it from the Chrome Web Store](https://chromewebstore.google.com/detail/fluff-meter-for-linkedin/ijfddippbjffofanjhmnfikabkkeeckj)**, then open LinkedIn. It works in Chrome, Edge,
Brave, Arc and other Chromium browsers.

It starts in **demo mode** with random numbers. Add an [API key](#api-key-required) to get real
scores.

<details>
<summary>Install from GitHub instead</summary>

1. Download the zip from the [latest release](https://github.com/horbel/fluff-meter/releases/latest)
   and unzip it.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the
   unzipped folder.
3. Open LinkedIn.

This version doesn't update itself; the Web Store one does.
</details>

## API key (required)

Fluff Meter has no server of its own: each post is scored by
[Jev](https://docs.typesafe.ai/concepts/system-one) with **your** key, and you pay the provider
directly. Either of these works; the extension tells them apart:

| Provider | Get a key | Looks like |
| --- | --- | --- |
| TypeSafe | [console.typesafe.ai/keys](https://console.typesafe.ai/keys) | any other key |
| OpenRouter | [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) | `sk-or-…` |

1. Create a key with one of them and add a few dollars of credit. **$1 covers about 10,000 posts.**
2. Click the Fluff Meter icon in the toolbar, paste the key and press **Save & test**.
3. The popup switches from *Demo* to *Live · Jev via …*. Reload LinkedIn.

Without a key nothing is sent anywhere, and the badges are random: demo mode is only a preview.

> [!TIP]
> Give the key a spending limit (OpenRouter lets you set one per key). The key stays in Chrome on
> your device and other extensions can't read it, but a limit caps the cost if it ever leaks.

## Make it yours

The fluff score is the same for everyone. The rest is two short lists:

- **🙈 Fold**: too much fluff (pure fluff by default), a category or a topic of your own
  (*promo*, *crypto*), a cliché (*bait*, *reads like AI*).
- **⭐ Always show**: a category or topic (*know-how*, *Rust*), a good sign. Posts with real
  numbers, a real take or a mistake owned always show by default. Always show wins over Fold.

Add a rule with **+ Add**, or start from a preset: **Engineer**, **Recruiter** or **Job seeker**.

<table>
<tr>
<td width="33%" valign="top"><img src="docs/popup-rules.png" alt="The popup's two lists of rules. Fold: too much fluff at the Pure fluff level, Promo, the topic crypto and Bait. Always show: Know-how, News, Real numbers, Real take and Owns a mistake." /></td>
<td width="33%" valign="top"><img src="docs/popup-add.png" alt="The Fold list with + Add open: every category, every cliché with a one-line explanation of the one pointed at, and a field for a topic of your own." /></td>
<td width="33%" valign="top"><img src="docs/popup-stats.png" alt="The popup's feed stats: 41% Light fluff this week, 186 posts, 40 folded, top clichés and categories." /></td>
</tr>
<tr>
<td valign="top"><sub><b>Two lists.</b> What folds, and what always shows.</sub></td>
<td valign="top"><sub><b>+ Add.</b> Every category, cliché and good sign, or a topic of your own.</sub></td>
<td valign="top"><sub><b>Your feed in numbers.</b> Today, this week or this month.</sub></td>
</tr>
</table>

The quickest way is right on a post: click any chip to see what it means, then fold or always
show posts like it.

<img src="docs/chip-card.png" width="560" alt="A post with the Bait chip clicked: a card explains it begs for likes, comments or reposts, gives examples, and has a switch, Posts with bait: Show or Fold." />

## Privacy

Fluff Meter collects nothing. There is no server of ours, no account and no analytics in the
extension.

- Your API key, settings and feed stats stay on your device, in Chrome's local storage. They are
  never synced, and LinkedIn's page can't read them.
- Without a key, nothing leaves your browser.
- With a key, the text of the posts you scroll past (and your topics, if you added any) goes
  straight to the AI provider you picked, and nowhere else.

[Details](PRIVACY.md).


## Meet the cloud

The icon is a cloud of fluff that has read one post too many. The lilac and the attitude come from
Lumpy Space Princess in *Adventure Time*. The pose comes from Ariadne in Guido Reni's *Bacchus and
Ariadne*: head on her hand, eyes to the sky, clearly done with this conversation.

<img src="docs/meme.jpg" width="420" alt="Guido Reni's Bacchus and Ariadne with the Fluff Meter cloud in place of Ariadne's head, a 99% Pure fluff badge across her chest and a LinkedIn logo as Bacchus's fig leaf" />

<sub>After Guido Reni, <i>Bacchus and Ariadne</i> (c. 1619-20), LACMA. The painting is public domain.</sub>

## Share it

Know someone whose feed needs this? Send them the Web Store link:

```
https://chromewebstore.google.com/detail/fluff-meter-for-linkedin/ijfddippbjffofanjhmnfikabkkeeckj
```

Developers can have the code instead: https://github.com/horbel/fluff-meter

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
