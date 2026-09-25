import type { PostInput } from "../analysis/types";
import { SELECTORS } from "./selectors";

/** Shorter than this and there is nothing to judge ("Congrats!", a bare link). */
export const MIN_POST_CHARS = 40;

export interface FoundPost {
  root: HTMLElement;
  /** The block the badge is inserted before: the author's text paragraph. */
  anchor: HTMLElement;
  post: PostInput;
  /** Too short to score. It gets a joke instead of a request to the model. */
  short: boolean;
  /** The author's display name, shown on the bar of a folded post. Never sent anywhere. */
  authorName?: string;
}

/** Normalises LinkedIn's rendered text: hidden "hashtag" prefixes, "…more" buttons, blank runs. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\bhashtag#/gi, "#")
    .replace(/[ \t]*…\s*(see )?more\s*$/i, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readText(el: HTMLElement): string {
  // innerText keeps line breaks the way the author wrote them; textContent is the
  // fallback for detached or hidden nodes (and for DOM shims in tests).
  return cleanText(el.innerText || el.textContent || "");
}

/** "https://www.linkedin.com/in/Jane-Doe-1/?x=y" → "in:jane-doe-1". */
export function profileId(href: string): string | undefined {
  const match = href.match(/\/(in|company)\/([^/?#]+)/);
  if (!match) return undefined;
  try {
    return `${match[1]}:${decodeURIComponent(match[2] ?? "").toLowerCase()}`;
  } catch {
    return undefined;
  }
}

/**
 * Whoever wrote the text. The header can also name someone else ("Jane likes this"), so the
 * author is the profile whose name the post menu mentions or, failing that, the last profile
 * linked above the text, which is the author line right on top of it.
 */
function findAuthor(root: HTMLElement, text: HTMLElement): { id?: string; name?: string } {
  const above = [...root.querySelectorAll<HTMLAnchorElement>(SELECTORS.profileLink)].filter(
    (a) => a.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const label = root.querySelector(SELECTORS.postMenu)?.getAttribute("aria-label") ?? "";
  const name = /post by/i.test(label) ? label.replace(/^.*post by\s*/i, "").trim() : "";
  const byName = name && above.find((a) => (a.textContent ?? "").includes(name));
  const link = byName || above.at(-1);
  const id = link ? profileId(link.getAttribute("href") ?? "") : undefined;
  return { ...(id ? { id } : {}), ...(name ? { name } : {}) };
}

/**
 * Whether the page actually shows an element. LinkedIn (or an ad blocker) hides some posts,
 * promoted ones especially, with `display: none` on a wrapper; those get no badge and no fold,
 * or a fold bar would stand in for a post that isn't there. Our own fold only squeezes the card,
 * so a folded post still counts as shown.
 */
export function isShown(el: Element, card: Element): boolean {
  // Up to the card only: that's where LinkedIn's wrappers are, and it keeps a scan cheap.
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (getComputedStyle(node).display === "none") return false;
    if (node === card) break;
  }
  return true;
}

function depth(el: Element, root: Element): number {
  let d = 0;
  for (let node: Element | null = el; node && node !== root; node = node.parentElement) d++;
  return d;
}

/** Finds every post card under `scope` that has enough text to judge. */
export function findPosts(scope: ParentNode = document): FoundPost[] {
  const byRoot = new Map<HTMLElement, HTMLElement[]>();
  for (const el of scope.querySelectorAll<HTMLElement>(SELECTORS.postText)) {
    if (el.closest(SELECTORS.excluded)) continue;
    // Legacy markup nests one text selector inside another; keep the outermost.
    if (el.parentElement?.closest(SELECTORS.postText)) continue;
    const root = el.closest<HTMLElement>(SELECTORS.postRoot);
    if (!root) continue;
    const list = byRoot.get(root) ?? [];
    list.push(el);
    byRoot.set(root, list);
  }

  const posts: FoundPost[] = [];
  for (const [root, texts] of byRoot) {
    const [own, ...rest] = texts;
    if (!own || !isShown(own, root)) continue;
    // A repost renders the original post deeper in the card than the author's comment.
    const ownDepth = depth(own, root);
    const reshared = rest.find((el) => depth(el, root) > ownDepth);
    const text = readText(own);
    const resharedText = reshared ? readText(reshared) : "";
    if (!text && !resharedText) continue;
    const block = own.closest<HTMLElement>("p, .feed-shared-update-v2__description-wrapper") ?? own;
    // A plain repost has no comment, only the original post wrapped in a link to it.
    // The badge goes before that link, not inside it, so clicking it doesn't navigate.
    const link = block.closest<HTMLElement>("a");
    const author = findAuthor(root, own);
    posts.push({
      root,
      anchor: link && root.contains(link) ? link : block,
      short: text.length + resharedText.length < MIN_POST_CHARS,
      ...(author.name ? { authorName: author.name } : {}),
      post: {
        text,
        ...(resharedText ? { reshared: resharedText } : {}),
        ...(author.id ? { author: author.id } : {}),
      },
    });
  }
  return posts;
}
