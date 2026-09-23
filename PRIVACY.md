# Privacy

Bullshit Detector has no server, no analytics and no account. Here is everything it does with data.

## What leaves your browser

- **Demo mode (no key):** nothing. Scores are generated locally.
- **With a key:** the text of each post you scroll past is sent to the provider whose key you
  entered, and only there:
  - TypeSafe: `https://api.typesafe.ai/v1/systemone` ([TypeSafe legal](https://docs.typesafe.ai/legal))
  - OpenRouter: `https://openrouter.ai/api/v1/systemone` ([OpenRouter privacy](https://openrouter.ai/privacy))

Only the post text is sent. Author names, profile data, images, comments and your own identity
are not. (The extension reads the author's profile id from the page for one feature; it stays in
your browser.) Each post is sent at most once; the result is cached.

## What is stored on your device

In `chrome.storage.local`, which never syncs to your Google account:

- your API key and your Customize settings;
- scores for posts you've seen, keyed by a hash of the post text (the text itself is not stored);
- feed analytics shown in the popup: per-day counts of posts, scores, categories and tropes for the
  last 60 days. Counts only, no post text or authors.

Uninstalling the extension deletes all of it. "Remove key" in the popup deletes the key.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Settings and the result cache. |
| `https://api.typesafe.ai/*`, `https://openrouter.ai/*` | Calling Jev from the background worker. |
| Content script on `https://www.linkedin.com/*` | Reading post text and drawing the badges. |

The API key is used only by the background worker and the popup. The script the extension runs on
LinkedIn never reads it, and the LinkedIn page itself cannot reach extension storage at all.
