# Changelog

## 0.3.0

Two separate things now: clichés are how a post is written and annoy everyone; categories are
what it is about, and only you know which ones you want.

- The Fluff Index counts clichés and empty language only. A category never makes a post fluffier.
- Clichés: Bait (now with "comment GUIDE for the PDF"), Humblebrag, Fable (was Parable), Truism,
  Hustle, Broetry, and the AI chip. Switch any of them off and it neither shows nor counts.
  Routine and Pitch are gone: they were categories in disguise.
- Categories, 12 instead of 13: Know-how, News, Opinion, Stories & lessons, Career moves,
  Thank-yous, Hiring, Job hunt, Events, Promo, Humor, Other. Mark each ⭐ want or 🙈 fold, or
  leave it unmarked. Plain "thanks X, Y and Z" posts are Thank-yous, not humblebrags.
- Your topics: up to three of your own, like "Rust" or "crypto", to star or fold.
- Folding: pure fluff (or fluffy too, or never) and hidden categories shrink to one line: the
  author, why it was folded and a Show button. Only in the feed; on a profile or a single post
  nothing folds. The popup counts folded posts and the time they saved.
- Posts the page hides itself (promoted posts, for example, when an ad blocker is on) get no
  badge and no fold, instead of a fold bar that opens onto nothing.
- Posts are scored further ahead, and each post that comes into range starts the next two, so
  badges and folds are ready before you scroll to them. Posts on screen go first, six at a time.
- A folded post keeps the bar's height (the bar lies on top), so LinkedIn still sees it and keeps
  loading the feed.
- Posts about a loss, a war or an illness get no badge and don't count in the stats.
- Four levels instead of six: Solid, Light fluff, Fluffy, Pure fluff.
- A slimmer badge: one row, at most two clichés, the AI chip only when a post reads like AI, the
  category as plain text.
- Presets: Default, Engineer, Recruiter, Job seeker.
- 📊 Real numbers: a green chip for posts that share real data or results. They never fold for
  fluff.
- Hustle now means the whole grindset: overwork, 4am routines, no days off.
- Chips are words only; how sure Jev is shows on hover and in the breakdown. The AI chip reads
  "Reads like AI" instead of a percentage. "No substance" is now "Nothing concrete", and every row
  of the breakdown explains itself on hover.
- Fold any post in the feed by hand; click anywhere on a folded post to open it.
- The breakdown says that images and videos aren't analyzed.
- New icon: a lilac cloud with scattered sparkles, posed like Ariadne in the meme (head tilted,
  eyes rolled up and to the right, lips parted). The toolbar version is bigger. Popup in lilac,
  with softer corners and a header that fades into the page.

## 0.2.2

- New icon: a white cloud with a three-color gauge on deep navy.
- Popup header in navy so the icon stands out; buttons stay LinkedIn blue.
- Store assets restyled on a light background.

## 0.2.1

- Icon and popup in LinkedIn blue.
- Store name: Fluff Meter for LinkedIn.

## 0.2.0

- The score pill shows a mini speedometer and reads well on any color.
- Clearer levels: No fluff, Mostly solid, A bit fluffy, Fluffy, Very fluffy, Pure fluff.
- The score pill has an arrow that opens the breakdown, the verdict emoji is back in the pill,
  and the AI chip comes last.
- New icon: a fluffy cloud with a gauge. Popup in the new colors.
- README screenshot shows a fluffy and a useful post side by side.
- Chrome Web Store assets in `store/`.
- The popup shows the same speedometer next to your feed's average.

## 0.1.0

First public release.

- Fluff Index (0–100%) on every LinkedIn post, with a breakdown of what drove it.
- AI detector: ✍️ Human, 🤔 AI? or 🤖 AI, with the style tells it found.
- Genres and tropes: bait, humblebrag, parable, truism, hustle, routine update, broetry, pitch.
- Posts of a few words get a joke ("🦗 Crickets") instead of a score, with no API call.
- Customize: show or hide any tag and set how much fluff it is for you, or pick a preset
  (Default, Engineer, Recruiter, Pragmatist).
- Feed analytics for today, 7 and 30 days, with tokens spent and estimated cost.
- Works with a TypeSafe or OpenRouter key; demo mode without one.
