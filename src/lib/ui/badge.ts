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
import { impact, personalIndex } from "../analysis/scoring";
import { type Analysis, CATEGORY_IDS, type SignalId, TROPE_IDS } from "../analysis/types";
import { REPO_URL } from "../constants";
import { hashText } from "../hash";
import type { DisplayPrefs } from "../settings";
import css from "./badge.css?inline";
import { h } from "./dom";
import { isEmpty, visibleParts } from "./visible";

export type BadgeState =
  | { status: "loading" }
  | { status: "done"; analysis: Analysis; provider?: ProviderId }
  | { status: "error"; message: string }
  /** Too short to judge; no model call was made. */
  | { status: "short" };

/** Custom tag, so LinkedIn's CSS has nothing to match and we can find our own nodes. */
export const BADGE_TAG = "fluff-meter-badge";

const CATEGORY_COUNT = CATEGORY_IDS.length;
const TROPE_COUNT = TROPE_IDS.length;
/** What a post of a few words gets instead of a score. */
const SHORT_JOKES = [
  "🤏 Too short to judge",
  "🦗 Crickets",
  "🥚 Barely a post",
  "🫥 Nothing to see here",
] as const;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * One badge per post, rendered in a closed shadow root: LinkedIn's styles can't leak in,
 * ours can't leak out, and the page's scripts can't reach inside.
 */
export class Badge {
  readonly host: HTMLElement;
  readonly #shadow: ShadowRoot;
  #state: BadgeState = { status: "loading" };
  #expanded = false;
  #counted = false;

  constructor(
    readonly key: string,
    private readonly onRetry: () => void,
    private readonly display: () => DisplayPrefs,
  ) {
    this.host = document.createElement(BADGE_TAG);
    this.host.dataset.key = key;
    this.#shadow = this.host.attachShadow({ mode: "closed" });
    // Clicks inside the badge must not open the post or trigger LinkedIn's handlers.
    for (const type of ["click", "mousedown", "pointerdown", "keydown"]) {
      this.host.addEventListener(type, (e) => e.stopPropagation());
    }
  }

  render(state: BadgeState = this.#state): void {
    this.#state = state;
    const body =
      state.status === "loading"
        ? this.#loading()
        : state.status === "error"
          ? this.#error(state.message)
          : state.status === "short"
            ? this.#short()
            : this.#done(state.analysis, state.provider);
    // With everything switched off in the popup, the badge takes no space at all.
    this.host.hidden = !body;
    this.host.dataset.theme = pageTheme();
    this.#shadow.replaceChildren(...(body ? [h("style", null, css), body] : []));
  }

  #loading(): HTMLElement | null {
    const prefs = this.display();
    const anything =
      prefs.showIndex ||
      prefs.showAi ||
      prefs.hiddenCategories.length < CATEGORY_COUNT ||
      prefs.hiddenTropes.length < TROPE_COUNT;
    if (!anything) return null;
    return h(
      "div",
      { class: "row", role: "status", "aria-live": "polite" },
      h("span", { class: "pill pill--loading" }, "☁️ Weighing…"),
    );
  }

  #short(): HTMLElement | null {
    if (!this.display().showIndex) return null;
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

  #done(analysis: Analysis, provider?: ProviderId): HTMLElement | null {
    const legend = analysis.source === "legend";
    const parts = visibleParts(analysis, this.display());
    if (isEmpty(parts) && !legend) return null;

    // The reader's sliders shift the number they see; the cached signals stay as they are.
    const index = legend ? 0 : personalIndex(analysis, this.display());
    const verdict = legend ? LEGEND_VERDICT : verdictFor(index);
    const demo = analysis.source === "demo";
    const number = h("span", { class: "index-number" }, `${index}%`);
    const toggle = () => {
      this.#expanded = !this.#expanded;
      this.render();
    };

    const firstRender = !this.#counted;
    const why = h(
      "button",
      { class: "expand", type: "button", "aria-expanded": String(this.#expanded), onclick: toggle },
      this.#expanded ? "Hide" : "Why?",
    );
    const row = h(
      "div",
      { class: "row" },
      // One pill carries the score and the verdict; "Why?" sits right next to it.
      parts.index &&
        h(
          "button",
          {
            class: "pill pill--index",
            type: "button",
            style: `--hue:${verdict.hue}`,
            "aria-expanded": String(this.#expanded),
            title: "Fluff Index. Click for the breakdown.",
            onclick: toggle,
          },
          legend
            ? h("span", { "aria-hidden": "true" }, verdict.emoji)
            : gauge(index, firstRender && !reducedMotion()),
          number,
          h("span", { class: "pill-sep", "aria-hidden": "true" }),
          h("span", { class: "verdict" }, verdict.label),
          demo && h("span", { class: "demo-tag" }, "DEMO"),
        ),
      why,
      legend
        ? h("span", { class: "chip chip--legend" }, LEGEND_CHIP)
        : parts.category &&
            h(
              "span",
              { class: "chip chip--category" },
              `${CATEGORY_LABELS[parts.category].emoji} ${CATEGORY_LABELS[parts.category].label}`,
            ),
      ...parts.tropes.map((id) => {
        const t = TROPE_LABELS[id];
        return h("span", { class: "chip chip--trope", title: t.hint }, `${t.emoji} ${t.label}`);
      }),
      // A guess, so it goes last: what the post is and does comes first.
      parts.ai && aiChip(analysis),
    );

    // Count up only the first time a badge shows a result; re-renders show the final number.
    if (!parts.index) {
      // nothing to animate
    } else if (!this.#counted) {
      this.#counted = true;
      countUp(number, index);
    } else {
      this.host.dataset.settled = "";
    }

    return h(
      "div",
      { class: "badge" },
      row,
      this.#expanded && this.#details(analysis, index, provider),
    );
  }

  #details(analysis: Analysis, index: number, provider?: ProviderId): HTMLElement {
    const demo = analysis.source === "demo";
    const legend = analysis.source === "legend";
    const prefs = this.display();
    const weights = impact(prefs.tropeWeights);
    const genreWeight = prefs.categoryWeights[analysis.category] ?? 0;
    const genre = CATEGORY_LABELS[analysis.category];
    const rows = (Object.keys(weights) as SignalId[]).map((id) => ({
      label: SIGNAL_LABELS[id],
      value: analysis.signals[id],
      impact: weights[id],
    }));
    const ranked = rows.sort((a, b) => b.impact * b.value - a.impact * a.value);

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
        ...ranked.map(({ label, value }) =>
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
        genreWeight > 0 &&
        h(
          "p",
          { class: "ai-line" },
          `${genre.emoji} ${genre.label} posts count as ${Math.round(genreWeight * 100)}% fluff for you`,
        ),
      !legend &&
        h(
          "p",
          { class: "ai-line" },
          h(
            "strong",
            null,
            `${aiLabel(analysis.ai.likelihood).emoji} ${aiLabel(analysis.ai.likelihood).label}`,
          ),
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

function aiChip(analysis: Analysis): HTMLElement {
  const { emoji, label, level } =
    analysis.source === "legend"
      ? { emoji: "✍️", label: "Human", level: "human" as const }
      : aiLabel(analysis.ai.likelihood);
  return h(
    "span",
    {
      class: `chip chip--ai chip--ai-${level}`,
      title: "Does it read like AI? A guess from style, not proof.",
    },
    `${emoji} ${label}`,
  );
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

const SVG = "http://www.w3.org/2000/svg";

function svg(tag: string, attrs: Record<string, string | number>, ...children: SVGElement[]) {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  el.append(...children);
  return el;
}

/**
 * A tiny speedometer, the extension's icon in miniature: green on the left, red on the right,
 * and a needle pointing at the score. On first show the needle sweeps up from zero.
 */
function gauge(index: number, sweep: boolean): SVGElement {
  const angle = -90 + (180 * Math.min(100, Math.max(0, index))) / 100;
  const needle = svg("line", { class: "gauge-needle", x1: 14, y1: 14, x2: 14, y2: 5 });
  needle.style.transform = `rotate(${sweep ? -90 : angle}deg)`;
  if (sweep)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        needle.style.transform = `rotate(${angle}deg)`;
      }),
    );
  return svg(
    "svg",
    { class: "gauge", viewBox: "0 0 28 16", width: 26, height: 15, "aria-hidden": "true" },
    svg(
      "defs",
      {},
      svg(
        "linearGradient",
        { id: "gauge-arc", x1: 0, y1: 0, x2: 1, y2: 0 },
        svg("stop", { offset: 0, "stop-color": "#2fbf71" }),
        svg("stop", { offset: 0.5, "stop-color": "#f2b134" }),
        svg("stop", { offset: 1, "stop-color": "#e5484d" }),
      ),
    ),
    svg("path", { class: "gauge-arc", d: "M3 14 A11 11 0 0 1 25 14" }),
    needle,
    svg("circle", { class: "gauge-hub", cx: 14, cy: 14, r: 2.2 }),
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
