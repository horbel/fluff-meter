/**
 * Every LinkedIn DOM assumption lives in this file. LinkedIn ships obfuscated class names
 * that change often, so the selectors lean on `data-testid` and ARIA roles, which have been
 * stable, and keep the older class-based markup as a fallback for accounts on the old UI.
 *
 * If badges stop appearing after a LinkedIn update, this is the file to fix.
 * Last checked against the live feed: 2026-09-23.
 */
export const SELECTORS = {
  /** The element holding a post's text. The full text is in the DOM even when clamped. */
  postText: [
    '[data-testid="expandable-text-box"]',
    ".update-components-text", // pre-2026 feed
    ".feed-shared-inline-show-more-text", // pre-2026 feed
  ].join(","),

  /** The card a text belongs to. The first match walking up from the text wins. */
  postRoot: [
    '[data-testid="mainFeed"] [role="listitem"]',
    '[data-urn^="urn:li:activity"]', // pre-2026 feed
    ".feed-shared-update-v2", // pre-2026 feed
    '[role="listitem"]',
    "article",
  ].join(","),

  /** Links to a person or a company page. The author's is among those above the post text. */
  profileLink: 'a[href*="/in/"], a[href*="/company/"]',

  /** The "…" menu, labelled "Open control menu for post by <author name>" in English. */
  postMenu: 'button[aria-label*="post by" i]',

  /** Text inside these is a comment, an editor or a preview, never the post itself. */
  excluded: [
    '[data-testid*="commentList"]',
    ".comments-comments-list", // pre-2026 feed
    ".comments-comment-item", // pre-2026 feed
    '[contenteditable="true"]',
    '[role="dialog"]',
  ].join(","),
} as const;
