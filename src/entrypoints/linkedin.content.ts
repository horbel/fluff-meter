import type { PostInput } from "@/lib/analysis/types";
import { hashText } from "@/lib/hash";
import { type FoundPost, findPosts, isShown } from "@/lib/linkedin/extract";
import { isFeedPath, SELECTORS } from "@/lib/linkedin/selectors";
import { RemoteError, send } from "@/lib/messages";
import { type PublicSettings, publicSettingsItem } from "@/lib/settings";
import { BADGE_TAG, Badge, type BadgeState, FOLD_TAG, FOLDED_ATTR } from "@/lib/ui/badge";

/**
 * Posts are scored well before they scroll into view, mostly ahead of the reader, so the badge
 * (or the fold) is ready on arrival instead of popping in while they read.
 */
const PRELOAD_MARGIN = "800px 0px 2000px 0px";
/** On top of that, every post that comes into range also starts the next ones in the feed. */
const LOOKAHEAD = 2;

/** Height of a folded post: the fold bar's height. */
const FOLDED_HEIGHT = 44;

/**
 * A folded card shrinks to the fold bar's height and the bar lies on top of it. The card never
 * goes to zero: LinkedIn watches posts come into view (to load the next page of the feed, among
 * other things), and a zero-height post is never seen. It is squeezed rather than hidden, so its
 * text stays rendered and reads the same (same key, no new request).
 */
const PAGE_CSS = `[${FOLDED_ATTR}] {
  box-sizing: border-box !important;
  height: ${FOLDED_HEIGHT}px !important;
  min-height: 0 !important;
  max-height: ${FOLDED_HEIGHT}px !important;
  overflow: hidden !important;
}
:has(> ${FOLD_TAG}) {
  position: relative !important;
}
${FOLD_TAG} {
  position: absolute !important;
  inset: 0 0 auto 0 !important;
  z-index: 2 !important;
}`;

/** Undoes what a fold did to LinkedIn's card. */
function release(card: Element): void {
  if (!card.hasAttribute(FOLDED_ATTR)) return;
  card.removeAttribute(FOLDED_ATTR);
  card.removeAttribute("inert");
}

export default defineContentScript({
  matches: ["https://www.linkedin.com/*"],
  runAt: "document_idle",

  async main(ctx) {
    let settings: PublicSettings = await publicSettingsItem.getValue();

    /** Results by post key. Survives LinkedIn re-rendering a card, so nothing is re-requested. */
    const states = new Map<string, BadgeState>();
    const badges = new Map<string, Set<Badge>>();
    /** Cards waiting to scroll near the viewport, with the post they held when found. */
    let waiting = new WeakMap<Element, { key: string; post: PostInput }>();

    const pageStyle = document.createElement("style");
    pageStyle.textContent = PAGE_CSS;
    document.head.append(pageStyle);

    // The reader's topics are part of the question, so they are part of the key too.
    const topicsOf = (s: PublicSettings) => s.display.topics.map((t) => t.label).join("\n");
    const keyOf = (post: PostInput) =>
      `${settings.mode.kind}:${hashText(`${post.text}\n${post.reshared ?? ""}\n${topicsOf(settings)}`)}`;

    const setState = (key: string, state: BadgeState) => {
      states.set(key, state);
      for (const badge of badges.get(key) ?? []) badge.render(state);
    };

    /** `urgent`: the post is on screen now, so it jumps the queue of posts scored ahead. */
    const analyze = async (key: string, post: PostInput, urgent = true) => {
      setState(key, { status: "loading" });
      try {
        const analysis = await send({
          type: "analyze",
          post,
          foldable: isFeedPath(location.pathname),
          urgent,
        });
        const provider = settings.mode.kind === "live" ? settings.mode.provider : undefined;
        setState(key, { status: "done", analysis, ...(provider ? { provider } : {}) });
      } catch (err) {
        const message = err instanceof RemoteError ? err.message : "Something went wrong.";
        setState(key, { status: "error", message });
      }
    };

    const mount = (key: string, { root, anchor, post, authorName }: FoundPost) => {
      const badge = new Badge(
        key,
        root,
        authorName,
        () => void analyze(key, post),
        () => settings.display,
        () => isFeedPath(location.pathname),
      );
      anchor.before(badge.host);
      const set = badges.get(key) ?? new Set();
      set.add(badge);
      badges.set(key, set);
      badge.render(states.get(key));
    };

    /** Post cards in feed order, as of the last scan. */
    let order: Element[] = [];

    /** Mounts the badge on a card waiting for it and starts scoring it. */
    const activate = (root: Element) => {
      io.unobserve(root);
      const job = waiting.get(root);
      waiting.delete(root);
      // The card may have been recycled for another post since it was queued.
      if (!job || root.querySelector(`${BADGE_TAG}[data-key="${job.key}"]`)) return;
      const found = findPosts(root).find((p) => p.root === root && keyOf(p.post) === job.key);
      if (!found) return;
      mount(job.key, found);
      const box = root.getBoundingClientRect();
      const onScreen = box.top < window.innerHeight && box.bottom > 0;
      if (!states.has(job.key)) void analyze(job.key, found.post, onScreen);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !settings.enabled) continue;
          activate(entry.target);
          const at = order.indexOf(entry.target);
          if (at < 0) continue;
          for (const next of order.slice(at + 1, at + 1 + LOOKAHEAD)) {
            if (waiting.has(next)) activate(next);
          }
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );

    const scan = () => {
      // Forget badges LinkedIn has thrown away along with their cards.
      for (const [key, set] of badges) {
        for (const badge of set) if (!badge.host.isConnected) set.delete(badge);
        if (!set.size) badges.delete(key);
      }
      // A fold bar whose card LinkedIn replaced, or hid itself, would otherwise hang on alone.
      for (const bar of document.querySelectorAll(FOLD_TAG)) {
        const card = bar.nextElementSibling;
        const text = card?.querySelector(SELECTORS.postText);
        if (!card?.hasAttribute(FOLDED_ATTR) || !text || !isShown(text, card)) {
          bar.remove();
          if (card) release(card);
        }
      }
      if (!settings.enabled) return;

      const posts = findPosts();
      order = posts.map((p) => p.root);
      for (const found of posts) {
        const { root, post, short } = found;
        const key = keyOf(post);
        const existing = root.querySelector<HTMLElement>(BADGE_TAG);
        if (existing?.dataset.key === key) continue;
        if (existing) {
          // The card now shows a different post: drop the old badge and any fold it made.
          existing.remove();
          unfoldCard(root);
        }

        // A few words get a joke right away: nothing to send, nothing to wait for.
        if (short) states.set(key, { status: "short" });

        if (states.has(key)) {
          mount(key, found);
        } else if (waiting.get(root)?.key !== key) {
          waiting.set(root, { key, post });
          io.observe(root);
        }
      }
    };

    let scheduled = false;
    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scan();
      });
    };

    const unfoldCard = (card: Element) => {
      const bar = card.previousElementSibling;
      if (bar?.tagName.toLowerCase() === FOLD_TAG) bar.remove();
      release(card);
    };

    const removeAll = () => {
      for (const el of document.querySelectorAll(`${BADGE_TAG}, ${FOLD_TAG}`)) el.remove();
      for (const card of document.querySelectorAll(`[${FOLDED_ATTR}]`)) release(card);
      badges.clear();
    };

    const mo = new MutationObserver((mutations) => {
      // Our own badge renders happen inside closed shadow roots and don't show up here, but
      // inserting a badge host does; skip batches that only contain those.
      const external = mutations.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (n) =>
            !(n instanceof HTMLElement && [BADGE_TAG, FOLD_TAG].includes(n.tagName.toLowerCase())),
        ),
      );
      if (external) scheduleScan();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const unwatch = publicSettingsItem.watch((next) => {
      const modeChanged =
        JSON.stringify(next.mode) !== JSON.stringify(settings.mode) ||
        topicsOf(next) !== topicsOf(settings);
      const onlyDisplay =
        !modeChanged &&
        next.enabled === settings.enabled &&
        JSON.stringify(next.display) !== JSON.stringify(settings.display);
      settings = next;
      if (onlyDisplay) {
        // Same results, different labels: re-render in place, no new requests.
        for (const set of badges.values()) for (const badge of set) badge.render();
        return;
      }
      if (modeChanged || !next.enabled) {
        removeAll();
        states.clear();
      }
      // Start over, so posts already on screen are picked up again rather than waiting
      // for an intersection change that won't come.
      io.disconnect();
      waiting = new WeakMap();
      scheduleScan();
    });

    ctx.onInvalidated(() => {
      mo.disconnect();
      io.disconnect();
      unwatch();
      removeAll();
      pageStyle.remove();
    });

    scan();
  },
});
