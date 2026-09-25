import {
  AI_TELL_LABELS,
  aiLabel,
  CATEGORY_LABELS,
  LEGEND_CHIP,
  LEGEND_VERDICT,
  SIGNAL_LABELS,
  TROPE_LABELS,
  verdictFor,
} from "../analysis/labels";
import { PROVIDERS, type ProviderId } from "../analysis/providers";
import { impact } from "../analysis/scoring";
import type { Analysis, SignalId } from "../analysis/types";
import { REPO_URL } from "../constants";
import { hashText } from "../hash";
import {
  type FoldReason,
  offSignals,
  type PersonalView,
  personalView,
  TOPIC_THRESHOLD,
} from "../personal";
import type { DisplayPrefs } from "../settings";
import css from "./badge.css?inline";
import { h } from "./dom";
import foldCss from "./fold.css?inline";
import { gauge } from "./gauge";
import { isEmpty, visibleParts } from "./visible";

export type BadgeState =
  | { status: "loading" }
  | { status: "done"; analysis: Analysis; provider?: ProviderId }
  | { status: "error"; message: string }
  /** Too short to judge; no model call was made. */
  | { status: "short" };

/** Custom tags, so LinkedIn's CSS has nothing to match and we can find our own nodes. */
export const BADGE_TAG = "fluff-meter-badge";
export const FOLD_TAG = "fluff-meter-fold";
/** Set on a post card while it is folded; the page stylesheet in linkedin.content.ts reads it. The fold bar sits right before that card. */
export const FOLDED_ATTR = "data-fluff-folded";

/** What a post of a few words gets instead of a score. */
const SHORT_JOKES = [
  "🤏 Too short to judge",
  "🦗 Crickets",
  "🥚 Barely a post",
  "🫥 Nothing to see here",
] as const;

/** Posts the reader unfolded in this tab. Shared by every badge, so a re-rendered card stays open. */
const revealed = new Set<string>();

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One badge per post, rendered in a closed shadow root: LinkedIn's styles can't leak in,
 * ours can't leak out, and the page's scripts can't reach inside. When the reader's settings
 * fold the post, the badge also puts a one-line bar at the top of the card and collapses the
 * rest of it.
 */
export class Badge {
  readonly host: HTMLElement;
  readonly #shadow: ShadowRoot;
  #state: BadgeState = { status: "loading" };
  #expanded = false;
  #counted = false;
  #fold: { host: HTMLElement; shadow: ShadowRoot } | undefined;

  constructor(
    readonly key: string,
    private readonly card: HTMLElement,
    private readonly author: string | undefined,
    private readonly onRetry: () => void,
    private readonly display: () => DisplayPrefs,
  ) {
    this.host = createHost(BADGE_TAG);
    this.host.dataset.key = key;
    this.#shadow = this.host.attachShadow({ mode: "closed" });
  }

  render(state: BadgeState = this.#state): void {
    this.#state = state;
    const prefs = this.display();
    const view = state.status === "done" ? personalView(state.analysis, prefs) : undefined;
    const body =
      state.status === "loading"
        ? this.#loading(prefs)
        : state.status === "error"
          ? this.#error(state.message)
          : state.status === "short"
            ? this.#short(prefs)
            : this.#done(state.analysis, view as PersonalView, prefs, state.provider);
    // With everything switched off in the popup, the badge takes no space at all.
    this.host.hidden = !body;
    this.host.dataset.theme = pageTheme();
    this.#shadow.replaceChildren(...(body ? [h("style", null, css), body] : []));

    const fold = state.status === "done" && !revealed.has(this.key) ? view?.fold : undefined;
    if (fold && state.status === "done") this.#showFold(state.analysis, view as PersonalView, fold);
    else this.unfold();
  }

  /** Takes the fold bar away and lets the card show again. */
  unfold(): void {
    this.#fold?.host.remove();
    this.#fold = undefined;
    this.card.removeAttribute(FOLDED_ATTR);
  }

  #showFold(analysis: Analysis, view: PersonalView, reason: FoldReason): void {
    if (!this.#fold) {
      const host = createHost(FOLD_TAG);
      this.#fold = { host, shadow: host.attachShadow({ mode: "closed" }) };
    }
    const { host, shadow } = this.#fold;
    host.dataset.theme = pageTheme();
    const verdict = verdictFor(view.index);
    const why =
      reason.kind === "fluff"
        ? [
            h("span", { class: "score", style: `--hue:${verdict.hue}` }, `${view.index}%`),
            h("span", { class: "label" }, verdict.label),
            ...analysis.tropes
              .filter((t) => !this.display().hiddenTropes.includes(t))
              .slice(0, 2)
              .map((t) => h("span", { class: "muted" }, `· ${TROPE_LABELS[t].label}`)),
          ]
        : [
            h("span", { class: "label" }, "🙈"),
            h(
              "span",
              { class: "label" },
              reason.kind === "category"
                ? CATEGORY_LABELS[reason.category].label
                : `“${reason.topic}”`,
            ),
          ];
    const show = () => {
      revealed.add(this.key);
      this.render();
    };
    shadow.replaceChildren(
      h("style", null, foldCss),
      h(
        "div",
        {
          class: "fold",
          title:
            reason.kind === "fluff" ? "Folded: too much fluff for you" : "Folded: you hide this",
        },
        h("span", { class: "why" }, ...why),
        this.author && h("span", { class: "author" }, this.author),
        h("button", { class: "show", type: "button", onclick: show }, "Show"),
      ),
    );
    // The bar goes right before the card, and the card itself collapses (see PAGE_CSS in
    // linkedin.content.ts). LinkedIn's card is the white box; what's inside it is partly
    // `display: contents`, which can't be squeezed.
    if (host.nextElementSibling !== this.card) this.card.before(host);
    this.card.setAttribute(FOLDED_ATTR, "");
  }

  #loading(prefs: DisplayPrefs): HTMLElement | null {
    if (!prefs.showIndex) return null;
    return h(
      "div",
      { class: "row", role: "status", "aria-live": "polite" },
      h("span", { class: "pill pill--loading" }, "Weighing…"),
    );
  }

  #short(prefs: DisplayPrefs): HTMLElement | null {
    if (!prefs.showIndex) return null;
    // The same post always gets the same joke.
    const joke =
      SHORT_JOKES[Number.parseInt(hashText(this.key).slice(-4), 36) % SHORT_JOKES.length];
    return h(
      "div",
      { class: "row" },
      h(
        "span",
        { class: "pill pill--short", title: "Too short to score. No model was asked." },
        joke,
      ),
    );
  }

  #error(message: string): HTMLElement {
    return h(
      "div",
      { class: "row", role: "status" },
      h("span", { class: "pill pill--error" }, "⚠️ Not scored"),
      h("span", { class: "muted" }, message),
      h("button", { class: "link", type: "button", onclick: () => this.onRetry() }, "Retry"),
    );
  }

  #done(
    analysis: Analysis,
    view: PersonalView,
    prefs: DisplayPrefs,
    provider?: ProviderId,
  ): HTMLElement | null {
    // A post about a loss or a war gets no score and no labels. Not "sensitive", just nothing.
    if (analysis.sensitive) return null;
    const legend = analysis.source === "legend";
    const parts = visibleParts(analysis, prefs);
    const starred = [
      ...(view.wantedCategory ? [CATEGORY_LABELS[analysis.category].label] : []),
      ...view.wantedTopics,
    ];
    if (isEmpty(parts) && !legend && starred.length === 0) return null;

    const index = view.index;
    const verdict = legend ? LEGEND_VERDICT : verdictFor(index);
    const demo = analysis.source === "demo";
    const number = h("span", { class: "index-number" }, `${index}%`);
    const toggle = () => {
      this.#expanded = !this.#expanded;
      this.render();
    };
    const firstRender = !this.#counted;
    const refold = view.fold && revealed.has(this.key);

    const row = h(
      "div",
      { class: "row" },
      // One pill carries the score and the verdict; its arrow opens the breakdown.
      parts.index
        ? h(
            "button",
            {
              class: "pill pill--index",
              type: "button",
              style: `--hue:${verdict.hue}`,
              "aria-expanded": String(this.#expanded),
              title: this.#expanded ? "Hide the breakdown" : "Why this score? Show the breakdown",
              onclick: toggle,
            },
            gauge(index, firstRender && !reducedMotion(), 21),
            number,
            h("span", { class: "pill-sep", "aria-hidden": "true" }),
            h("span", { class: "verdict" }, verdict.label),
            demo && h("span", { class: "demo-tag" }, "DEMO"),
            chevron(this.#expanded),
          )
        : // With the index hidden there is no pill, so the breakdown gets a button of its own.
          h(
            "button",
            {
              class: "expand",
              type: "button",
              "aria-expanded": String(this.#expanded),
              title: "What drove this score",
              onclick: toggle,
            },
            this.#expanded ? "Hide ▴" : "Why ▾",
          ),
      legend && h("span", { class: "chip chip--legend" }, LEGEND_CHIP),
      // What the reader asked for comes first: it's the reason to read this one.
      ...starred.map((label) =>
        h(
          "span",
          { class: "chip chip--star", title: "You marked this as something you want" },
          `⭐ ${label}`,
        ),
      ),
      ...(legend
        ? []
        : parts.tropes.map((id) => {
            const t = TROPE_LABELS[id];
            return h("span", { class: "chip chip--trope", title: t.hint }, `${t.emoji} ${t.label}`);
          })),
      !legend &&
        parts.ai &&
        h(
          "span",
          { class: "chip chip--ai", title: "Reads like AI. A guess from style, not proof." },
          aiLabel(analysis.ai.likelihood).label,
        ),
      // Neutral context, so plain text rather than a chip.
      !legend &&
        parts.category &&
        !view.wantedCategory &&
        h(
          "span",
          { class: "category" },
          `${CATEGORY_LABELS[analysis.category].emoji} ${CATEGORY_LABELS[analysis.category].label}`,
        ),
      refold &&
        h(
          "button",
          {
            class: "link refold",
            type: "button",
            onclick: () => {
              revealed.delete(this.key);
              this.render();
            },
          },
          "Fold",
        ),
    );

    // Count up only the first time a badge shows a result; re-renders show the final number.
    if (parts.index && !this.#counted) {
      this.#counted = true;
      countUp(number, index);
    } else if (parts.index) {
      this.host.dataset.settled = "";
    }

    return h(
      "div",
      { class: "badge" },
      row,
      this.#expanded && this.#details(analysis, index, prefs, provider),
    );
  }

  #details(
    analysis: Analysis,
    index: number,
    prefs: DisplayPrefs,
    provider?: ProviderId,
  ): HTMLElement {
    const demo = analysis.source === "demo";
    const legend = analysis.source === "legend";
    const weights = impact(offSignals(prefs));
    const category = CATEGORY_LABELS[analysis.category];
    const rows = (Object.keys(weights) as SignalId[])
      .filter((id) => weights[id] > 0)
      .map((id) => ({ label: SIGNAL_LABELS[id], value: analysis.signals[id], impact: weights[id] }))
      .sort((a, b) => b.impact * b.value - a.impact * a.value);
    const ai = aiLabel(analysis.ai.likelihood);
    const topics = prefs.topics.filter((t) => (analysis.topics?.[t.label] ?? 0) >= TOPIC_THRESHOLD);

    return h(
      "div",
      { class: "details" },
      demo &&
        h(
          "p",
          { class: "notice" },
          "Demo: random numbers. Add a key in the popup for real scores.",
        ),
      legend && h("p", { class: "notice" }, "On the zero-fluff list. Science can't explain it."),
      h(
        "ul",
        { class: "signals" },
        ...rows.map(({ label, value }) =>
          h(
            "li",
            null,
            h("span", { class: "signal-label" }, label),
            h(
              "span",
              { class: "bar", "aria-hidden": "true" },
              h("span", {
                class: "bar-fill",
                style: `width:${Math.round(value * 100)}%;--hue:${verdictFor(value * 100).hue}`,
              }),
            ),
            h("span", { class: "signal-value" }, `${Math.round(value * 100)}%`),
          ),
        ),
      ),
      !legend &&
        h(
          "p",
          { class: "line" },
          h("strong", null, `${category.emoji} ${category.label}`),
          prefs.categories[analysis.category] === "want"
            ? " · you want these"
            : prefs.categories[analysis.category] === "hide"
              ? " · you fold these"
              : "",
          topics.length ? ` · about ${topics.map((t) => `“${t.label}”`).join(", ")}` : "",
        ),
      !legend &&
        h(
          "p",
          { class: "line" },
          h("strong", null, `${ai.emoji} ${ai.label}`),
          analysis.ai.tells.length
            ? ` · ${analysis.ai.tells.map((id) => AI_TELL_LABELS[id]).join(", ")}`
            : " · no AI tells found",
          h("span", { class: "muted" }, " · a guess from style, not proof"),
        ),
      h(
        "div",
        { class: "footer" },
        h(
          "span",
          { class: "muted" },
          demo
            ? "Random · nothing sent"
            : legend
              ? "Hand-verified"
              : `${shortModel(analysis.model)}${provider ? ` via ${PROVIDERS[provider].label}` : ""}`,
        ),
        !demo &&
          h(
            "button",
            {
              class: "link",
              type: "button",
              onclick: (e: Event) =>
                copyVerdict(e.currentTarget as HTMLButtonElement, index, legend),
            },
            "Copy",
          ),
      ),
    );
  }
}

/** A host element whose clicks never reach LinkedIn's handlers (they would open the post). */
function createHost(tag: string): HTMLElement {
  const host = document.createElement(tag);
  for (const type of ["click", "mousedown", "pointerdown", "keydown"]) {
    host.addEventListener(type, (e) => e.stopPropagation());
  }
  return host;
}

/** "typesafe/jev-1.13-20260917" → "jev-1.13-20260917". */
function shortModel(model = "Jev"): string {
  return model.replace(/^.*\//, "");
}

function copyVerdict(button: HTMLButtonElement, index: number, legend: boolean): void {
  const verdict = legend ? LEGEND_VERDICT : verdictFor(index);
  const text = `This LinkedIn post scored ${index}% on the Fluff Index ${verdict.emoji} (${verdict.label}). Measured with Fluff Meter: ${REPO_URL}`;
  navigator.clipboard.writeText(text).then(
    () => {
      button.textContent = "Copied ✓";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1500);
    },
    () => {
      button.textContent = "Couldn't copy";
    },
  );
}

/** The arrow at the end of the pill: a small round button that flips when open. */
function chevron(open: boolean): HTMLElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 12 12");
  icon.setAttribute("width", "8");
  icon.setAttribute("height", "8");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M2.5 4.5 6 8l3.5-3.5");
  icon.append(path);
  return h(
    "span",
    { class: open ? "pill-toggle is-open" : "pill-toggle", "aria-hidden": "true" },
    icon,
  );
}

function countUp(el: HTMLElement, target: number): void {
  if (reducedMotion() || target === 0) return;
  const start = performance.now();
  const duration = 700;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = `${Math.round(target * (1 - (1 - t) ** 3))}%`;
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = "0%";
  requestAnimationFrame(step);
}

/** LinkedIn's dark mode is a page setting, not the OS one, so read it off the page. */
function pageTheme(): "light" | "dark" {
  const bg =
    getComputedStyle(document.body)
      .backgroundColor.match(/[\d.]+/g)
      ?.map(Number) ?? [];
  const [r = 255, g = 255, b = 255, alpha = 1] = bg;
  if (alpha === 0) return "light";
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128 ? "dark" : "light";
}
