import type { PostInput } from "@/lib/analysis/types";
import { hashText } from "@/lib/hash";
import { findPosts } from "@/lib/linkedin/extract";
import { RemoteError, send } from "@/lib/messages";
import { type PublicSettings, publicSettingsItem } from "@/lib/settings";
import { BADGE_TAG, Badge, type BadgeState } from "@/lib/ui/badge";

/** Posts are scored a little before they scroll into view, so the badge is ready on arrival. */
const PRELOAD_MARGIN = "800px 0px";

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

    const keyOf = (post: PostInput) =>
      `${settings.mode.kind}:${hashText(`${post.text}\n${post.reshared ?? ""}`)}`;

    const setState = (key: string, state: BadgeState) => {
      states.set(key, state);
      for (const badge of badges.get(key) ?? []) badge.render(state);
    };

    const analyze = async (key: string, post: PostInput) => {
      setState(key, { status: "loading" });
      try {
        const analysis = await send({ type: "analyze", post });
        const provider = settings.mode.kind === "live" ? settings.mode.provider : undefined;
        setState(key, { status: "done", analysis, ...(provider ? { provider } : {}) });
      } catch (err) {
        const message = err instanceof RemoteError ? err.message : "Something went wrong.";
        setState(key, { status: "error", message });
      }
    };

    const mount = (key: string, post: PostInput, anchor: HTMLElement) => {
      const badge = new Badge(
        key,
        () => void analyze(key, post),
        () => settings.display,
      );
      anchor.before(badge.host);
      const set = badges.get(key) ?? new Set();
      set.add(badge);
      badges.set(key, set);
      badge.render(states.get(key));
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !settings.enabled) continue;
          io.unobserve(entry.target);
          const job = waiting.get(entry.target);
          waiting.delete(entry.target);
          // The card may have been recycled for another post since it was queued.
          if (!job || entry.target.querySelector(`${BADGE_TAG}[data-key="${job.key}"]`)) continue;
          const found = findPosts(entry.target).find(
            (p) => p.root === entry.target && keyOf(p.post) === job.key,
          );
          if (!found) continue;
          mount(job.key, found.post, found.anchor);
          if (!states.has(job.key)) void analyze(job.key, found.post);
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
      if (!settings.enabled) return;

      for (const { root, anchor, post, short } of findPosts()) {
        const key = keyOf(post);
        const existing = root.querySelector<HTMLElement>(BADGE_TAG);
        if (existing?.dataset.key === key) continue;
        existing?.remove(); // the card now shows a different post

        // A few words get a joke right away: nothing to send, nothing to wait for.
        if (short) states.set(key, { status: "short" });

        if (states.has(key)) {
          mount(key, post, anchor);
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

    const removeAll = () => {
      for (const el of document.querySelectorAll(BADGE_TAG)) el.remove();
      badges.clear();
    };

    const mo = new MutationObserver((mutations) => {
      // Our own badge renders happen inside closed shadow roots and don't show up here, but
      // inserting a badge host does; skip batches that only contain those.
      const external = mutations.some((m) =>
        [...m.addedNodes, ...m.removedNodes].some(
          (n) => !(n instanceof HTMLElement && n.tagName.toLowerCase() === BADGE_TAG),
        ),
      );
      if (external) scheduleScan();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const unwatch = publicSettingsItem.watch((next) => {
      const modeChanged = JSON.stringify(next.mode) !== JSON.stringify(settings.mode);
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
    });

    scan();
  },
});
