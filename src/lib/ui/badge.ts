import cloudSvg from "../../assets/cloud.svg?raw";
import {
  AI_TELL_LABELS,
  aiLabel,
  CATEGORY_LABELS,
  CLICHE_LABELS,
  GOOD_LABELS,
  LEGEND_CHIP,
  SECTIONS,
  SIGNAL_HINTS,
  SIGNAL_LABELS,
  TROPE_LABELS,
  tagTooltip,
  verdictFor,
} from "../analysis/labels";
import { PROVIDERS, type ProviderId } from "../analysis/providers";
import { CORE_SIGNALS } from "../analysis/scoring";
import type { Analysis, ClicheId } from "../analysis/types";
import { REPO_URL } from "../constants";
import { hashText } from "../hash";
import { send } from "../messages";
import {
  type FoldReason,
  goodSignsOf,
  type PersonalView,
  personalView,
  TOPIC_THRESHOLD,
} from "../personal";
import {
  type Rule,
  ruleLabel,
  ruleSentence,
  ruleTag,
  sameRule,
  type Verb,
  verbFor,
} from "../rules";
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

/**
 * Posts the reader unfolded, and posts they folded by hand, in this tab. Shared by every badge,
 * so a re-rendered card keeps its state.
 */
const revealed = new Set<string>();
const folded = new Set<string>();

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
  /** The chip whose card is open, by chip id. */
  #open: string | undefined;
  /** Hides the fold bar's Undo when its time is up. */
  #undoTimer: ReturnType<typeof setTimeout> | undefined;
  #fold: { host: HTMLElement; shadow: ShadowRoot } | undefined;

  constructor(
    readonly key: string,
    private readonly card: HTMLElement,
    private readonly author: string | undefined,
    private readonly onRetry: () => void,
    private readonly display: () => DisplayPrefs,
    /** Folding only makes sense in the feed; on a profile or a single post the reader came to read. */
    private readonly canFold: () => boolean = () => true,
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

    const fold = state.status === "done" && this.canFold() ? this.#foldReason(view) : undefined;
    if (fold && state.status === "done") this.#showFold(state.analysis, view as PersonalView, fold);
    else this.unfold();
  }

  #foldReason(view: PersonalView | undefined): FoldReason | undefined {
    if (folded.has(this.key)) return { kind: "manual" };
    return revealed.has(this.key) ? undefined : view?.fold;
  }

  /** Folds this post: back to its automatic fold if it had one, by hand otherwise. */
  #fold_(auto: boolean): void {
    revealed.delete(this.key);
    if (!auto) folded.add(this.key);
    this.render();
  }

  #reveal(): void {
    folded.delete(this.key);
    revealed.add(this.key);
    this.render();
  }

  /** Takes the fold bar away and lets the card show again. */
  unfold(): void {
    clearTimeout(this.#undoTimer);
    this.#fold?.host.remove();
    this.#fold = undefined;
    this.card.removeAttribute(FOLDED_ATTR);
    this.card.removeAttribute("inert");
  }

  #showFold(analysis: Analysis, view: PersonalView, reason: FoldReason): void {
    if (!this.#fold) {
      const host = createHost(FOLD_TAG);
      this.#fold = { host, shadow: host.attachShadow({ mode: "closed" }) };
    }
    const { host, shadow } = this.#fold;
    host.dataset.theme = pageTheme();
    const verdict = verdictFor(view.index);
    // Who first, then why: the reason is a pill, like the score on an open badge.
    const reasonPill =
      reason.kind === "fluff"
        ? h(
            "span",
            { class: "reason reason--fluff", style: `--hue:${verdict.hue}` },
            h("span", { class: "score" }, `${view.index}%`),
            verdict.label,
          )
        : h(
            "span",
            { class: "reason" },
            reason.kind === "manual" ? "Folded by you" : `🙈 ${foldLabel(reason)}`,
          );
    const tropes =
      reason.kind === "fluff" ? analysis.tropes.slice(0, 2).map((t) => TROPE_LABELS[t].label) : [];
    // Folded by a rule the reader made on a chip a moment ago: offer to take it back.
    const rule = ruleFor(reason, this.display());
    const left =
      recent && rule && sameRule(recent.rule, rule) ? UNDO_MS - (Date.now() - recent.at) : 0;
    const undo = left > 0 ? recent : undefined;
    clearTimeout(this.#undoTimer);
    if (undo) this.#undoTimer = setTimeout(() => this.render(), left + 50);
    // The whole bar opens the post, not only the button.
    const show = () => this.#reveal();
    shadow.replaceChildren(
      h("style", null, foldCss),
      h(
        "div",
        {
          class: "fold",
          onclick: show,
          title:
            reason.kind === "fluff"
              ? "Folded by Fluff Meter: too much fluff for you. Click to show."
              : reason.kind === "manual"
                ? "You folded this. Click to show."
                : "Folded by Fluff Meter: you fold these. Click to show.",
        },
        cloud(),
        this.author && h("span", { class: "author" }, this.author),
        reasonPill,
        tropes.length > 0 && h("span", { class: "tropes" }, tropes.join(" · ")),
        undo &&
          rule &&
          h(
            "button",
            {
              class: "undo",
              type: "button",
              title: `Stop: ${ruleSentence("fold", rule)}`,
              onclick: (e: Event) => {
                e.stopPropagation();
                recent = undefined;
                // Back to what it was before, a star included.
                void send(
                  undo.was === "show"
                    ? { type: "rule", action: "remove", verb: "fold", rule }
                    : { type: "rule", action: "add", verb: undo.was, rule },
                ).catch(() => {});
              },
            },
            "Undo",
          ),
        h("button", { class: "show", type: "button" }, "Show"),
      ),
    );
    // The bar goes right before the card, and the card itself collapses (see PAGE_CSS in
    // linkedin.content.ts). LinkedIn's card is the white box; what's inside it is partly
    // `display: contents`, which can't be squeezed.
    if (host.nextElementSibling !== this.card) this.card.before(host);
    this.card.setAttribute(FOLDED_ATTR, "");
    // What's left of the card sits under the bar: keep it out of reach of Tab and screen readers.
    this.card.setAttribute("inert", "");
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
    const parts = visibleParts(analysis, prefs);
    const starred = [
      ...(view.wantedCategory ? [CATEGORY_LABELS[analysis.category].label] : []),
      ...view.wantedTopics,
      ...view.wantedGood.map((id) => `${GOOD_LABELS[id].emoji} ${GOOD_LABELS[id].label}`),
    ];
    if (isEmpty(parts) && !analysis.legend && starred.length === 0) return null;

    const index = view.index;
    const verdict = verdictFor(index);
    const demo = analysis.source === "demo";
    const number = h("span", { class: "index-number" }, `${index}%`);
    const toggle = () => {
      this.#expanded = !this.#expanded;
      this.render();
    };
    const firstRender = !this.#counted;
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const category = CATEGORY_LABELS[analysis.category];
    const categoryRule = { kind: "category", id: analysis.category } as const;
    // What the reader starred comes first: it's the reason to read this one. Then good signs,
    // then clichés; the category, being neutral, goes last as plain text.
    const chips: Chip[] = [
      ...(view.wantedCategory
        ? [
            chip(
              "category",
              "chip chip--star",
              `⭐ ${category.label}`,
              categoryRule,
              pct(analysis.categoryConfidence),
            ),
          ]
        : []),
      ...view.wantedTopics.map((label) =>
        chip(`topic:${label}`, "chip chip--star", `⭐ ${label}`, { kind: "topic", label }),
      ),
      // Starred good signs show even with good-sign chips off, like starred categories do.
      ...goodSignsOf(analysis)
        .filter((id) => view.wantedGood.includes(id) || parts.good.includes(id))
        .map((id) => {
          const g = GOOD_LABELS[id];
          const starred = view.wantedGood.includes(id);
          return chip(
            `good:${id}`,
            starred ? "chip chip--star" : "chip chip--good",
            `${starred ? "⭐ " : ""}${g.emoji} ${g.label}`,
            { kind: "good", id },
            pct(analysis.good[id]),
          );
        }),
      ...parts.cliches.map((id) =>
        chip(
          `cliche:${id}`,
          "chip chip--cliche",
          `${CLICHE_LABELS[id].emoji} ${CLICHE_LABELS[id].label}`,
          { kind: "cliche", id },
          evidence(analysis, id),
        ),
      ),
      ...(parts.category && !view.wantedCategory
        ? [
            chip(
              "category",
              "category",
              `${category.emoji} ${category.label}`,
              categoryRule,
              pct(analysis.categoryConfidence),
            ),
          ]
        : []),
    ];
    const openChip = chips.find((c) => c.id === this.#open);
    // A card whose chip is gone stays closed, instead of reopening when the chip comes back.
    if (!openChip) this.#open = undefined;

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
      analysis.legend && h("span", { class: "chip chip--legend" }, LEGEND_CHIP),
      // Every chip is a button: what it means, and "fold / star posts like this".
      ...chips.map((chip) =>
        h(
          "button",
          {
            type: "button",
            class: chip.cls,
            "aria-expanded": String(this.#open === chip.id),
            title: "What is this?",
            onclick: () => {
              this.#open = this.#open === chip.id ? undefined : chip.id;
              this.render();
            },
          },
          chip.text,
        ),
      ),
      // Any post in the feed can be folded by hand; an automatic fold comes back the same way.
      this.canFold() &&
        h(
          "button",
          {
            class: "link fold-btn",
            type: "button",
            title: "Fold this post to one line",
            onclick: () => this.#fold_(!!view.fold),
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
      openChip && this.#card(openChip, analysis, view, prefs),
      this.#expanded && this.#details(analysis, index, prefs, provider),
    );
  }

  /**
   * The card under a chip: what it means, and what happens to posts like this one, as a switch
   * showing the current choice. If the choice doesn't apply to this very post, it says why.
   */
  #card(chip: Chip, analysis: Analysis, view: PersonalView, prefs: DisplayPrefs): HTMLElement {
    const { rule } = chip;
    const tag = ruleTag(rule);
    const current: Choice = verbFor(prefs, rule) ?? "show";
    // A topic is always folded or always shown; it's removed in the popup.
    const choices: Choice[] =
      rule.kind === "cliche"
        ? ["show", "fold"]
        : rule.kind === "good"
          ? ["show", "star"]
          : rule.kind === "topic"
            ? ["fold", "star"]
            : ["fold", "show", "star"];
    const kind =
      rule.kind === "cliche"
        ? "Cliché"
        : rule.kind === "good"
          ? "Good sign"
          : rule.kind === "topic"
            ? "Your topic"
            : "Category";
    const pick = (choice: Choice) => {
      if (choice === current) return;
      if (choice === "show" && current !== "show") {
        void send({ type: "rule", action: "remove", verb: current, rule }).catch(() => {});
        return;
      }
      if (choice === "fold") recent = { rule, at: Date.now(), was: current };
      if (choice !== "show")
        void send({ type: "rule", action: "add", verb: choice, rule }).catch(() => {});
    };
    const close = () => {
      this.#open = undefined;
      this.render();
    };
    const note = current === "fold" ? this.#whyOpen(analysis, view) : undefined;
    return h(
      "div",
      { class: "card", role: "dialog", "aria-label": ruleLabel(rule) },
      h(
        "p",
        { class: "card-title" },
        h("strong", null, ruleLabel(rule)),
        h("span", { class: "muted" }, ` · ${kind}${chip.sure ? ` · ${chip.sure}` : ""}`),
        h(
          "button",
          { type: "button", class: "card-x", "aria-label": "Close", onclick: close },
          "×",
        ),
      ),
      tag && h("p", { class: "card-line" }, tag.hint),
      tag && h("p", { class: "card-line muted" }, `e.g. ${tag.example}`),
      h(
        "div",
        { class: "card-actions" },
        h("span", { class: "card-subject" }, `${subjectOf(rule)}:`),
        h(
          "div",
          { class: "seg", role: "radiogroup", "aria-label": subjectOf(rule) },
          ...choices.map((choice) =>
            h(
              "button",
              {
                type: "button",
                role: "radio",
                "aria-checked": String(choice === current),
                class: `seg-${choice}`,
                onclick: () => pick(choice),
              },
              CHOICE_LABELS[choice],
            ),
          ),
        ),
      ),
      note && h("p", { class: "card-line card-note" }, note),
    );
  }

  /** Why a post stays open although a rule folds posts like it. */
  #whyOpen(analysis: Analysis, view: PersonalView): string | undefined {
    if (!this.canFold()) return "Nothing folds here, only in the feed.";
    if (revealed.has(this.key)) return "You opened this one.";
    if (view.fold) return undefined;
    const star = view.wantedCategory
      ? CATEGORY_LABELS[analysis.category].label
      : (view.wantedTopics[0] ??
        (view.wantedGood[0] ? GOOD_LABELS[view.wantedGood[0]].label : undefined));
    return star ? `This one stays open: ⭐ ${star} always shows.` : undefined;
  }

  #details(
    analysis: Analysis,
    index: number,
    prefs: DisplayPrefs,
    provider?: ProviderId,
  ): HTMLElement {
    const demo = analysis.source === "demo";
    const verdict = verdictFor(index);
    const category = CATEGORY_LABELS[analysis.category];
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const ai = aiLabel(analysis.ai.likelihood);
    const tropes = analysis.tropes;
    const good = goodSignsOf(analysis);
    const topics = prefs.topics.filter((t) => (analysis.topics?.[t.label] ?? 0) >= TOPIC_THRESHOLD);
    const mark = (id: ClicheId) => (prefs.foldTropes.includes(id) ? " · you fold these" : "");

    return h(
      "div",
      { class: "details" },
      demo &&
        h(
          "p",
          { class: "notice" },
          "Demo: random numbers. Add a key in the popup for real scores.",
        ),
      section(
        `${verdict.emoji} ${index}% fluff`,
        SECTIONS.fluff.hint,
        h(
          "ul",
          { class: "signals" },
          ...CORE_SIGNALS.map((id) => {
            const value = analysis.signals[id];
            return h(
              "li",
              { title: SIGNAL_HINTS[id] },
              h("span", { class: "signal-label" }, SIGNAL_LABELS[id]),
              h(
                "span",
                { class: "bar", "aria-hidden": "true" },
                h("span", {
                  class: "bar-fill",
                  style: `width:${pct(value)};--hue:${verdictFor(value * 100).hue}`,
                }),
              ),
              h("span", { class: "signal-value" }, pct(value)),
            );
          }),
        ),
      ),
      section(
        `🏷️ ${SECTIONS.cliches.title}`,
        SECTIONS.cliches.hint,
        ...tropes.map((id) =>
          h(
            "p",
            { class: "line", title: tagTooltip(TROPE_LABELS[id]) },
            h("strong", null, `${TROPE_LABELS[id].emoji} ${TROPE_LABELS[id].label}`),
            h("span", { class: "muted" }, ` · ${evidence(analysis, id)}`),
            mark(id),
          ),
        ),
        h(
          "p",
          { class: "line" },
          // Under Clichés, so it says "AI style" even when the verdict is "Human".
          h("strong", null, `🤖 AI style ${ai.percent}`),
          ` · ${ai.emoji} ${ai.label}`,
          analysis.ai.tells.length
            ? ` · ${analysis.ai.tells.map((id) => AI_TELL_LABELS[id]).join(", ")}`
            : " · judged by overall style, no specific tells",
          h("span", { class: "muted" }, " · a guess, not proof"),
          ai.level === "ai" ? mark("ai") : "",
        ),
      ),
      section(
        `✅ ${SECTIONS.good.title}`,
        SECTIONS.good.hint,
        ...good.map((id) =>
          h(
            "p",
            { class: "line", title: tagTooltip(GOOD_LABELS[id]) },
            h("strong", null, `${GOOD_LABELS[id].emoji} ${GOOD_LABELS[id].label}`),
            h("span", { class: "muted" }, ` · ${pct(analysis.good[id])} sure`),
            prefs.wantGood.includes(id) ? " · you want these" : "",
          ),
        ),
        good.length === 0 && h("p", { class: "line muted" }, "None found."),
      ),
      section(
        `${category.emoji} ${category.label}`,
        SECTIONS.about.hint,
        h(
          "p",
          { class: "line" },
          h("span", { class: "muted" }, `${pct(analysis.categoryConfidence)} sure`),
          prefs.categories[analysis.category] === "want"
            ? " · you want these"
            : prefs.categories[analysis.category] === "hide"
              ? " · you fold these"
              : "",
          topics.length ? ` · about ${topics.map((t) => `“${t.label}”`).join(", ")}` : "",
        ),
      ),
      h(
        "p",
        { class: "line muted" },
        "Only the text is read: images, videos and text in them aren't.",
      ),
      h(
        "div",
        { class: "footer" },
        h(
          "span",
          { class: "muted" },
          demo
            ? "Random · nothing sent"
            : `${shortModel(analysis.model)}${provider ? ` via ${PROVIDERS[provider].label}` : ""}`,
        ),
        !demo &&
          h(
            "button",
            {
              class: "link",
              type: "button",
              onclick: (e: Event) => copyVerdict(e.currentTarget as HTMLButtonElement, index),
            },
            "Copy",
          ),
      ),
    );
  }
}

/** One chip on a badge and the rule it stands for. */
interface Chip {
  id: string;
  cls: string;
  text: string;
  rule: Rule;
  /** How sure Jev is, or what code measured. */
  sure?: string;
}

function chip(id: string, cls: string, text: string, rule: Rule, sure?: string): Chip {
  return { id, cls, text, rule, ...(sure ? { sure } : {}) };
}

/** The last rule made from a chip in this tab, so the fold it causes can offer an undo. */
let recent: { rule: Rule; at: number; was: Choice } | undefined;
/** How long a fold bar offers Undo after a fold made on a chip's card. */
const UNDO_MS = 20_000;

/** What a chip's card can set posts like this one to. "show" means no rule. */
type Choice = Verb | "show";

const CHOICE_LABELS: Record<Choice, string> = {
  fold: "🙈 Fold",
  show: "Show",
  star: "⭐ Always show",
};

/** "Posts with bait", "Promo posts", "Posts about “Rust”". */
function subjectOf(rule: Rule): string {
  switch (rule.kind) {
    case "category":
      return `${CATEGORY_LABELS[rule.id].label} posts`;
    case "topic":
      return `Posts about “${rule.label}”`;
    case "cliche":
      return `Posts with ${CLICHE_LABELS[rule.id].label.toLowerCase()}`;
    case "good":
      return `Posts with ${GOOD_LABELS[rule.id].label.toLowerCase()}`;
    case "fluff":
      return "Posts this fluffy";
  }
}

/** The rule behind an automatic fold. */
function ruleFor(reason: FoldReason, prefs: DisplayPrefs): Rule | undefined {
  switch (reason.kind) {
    case "category":
      return { kind: "category", id: reason.category };
    case "topic":
      return { kind: "topic", label: reason.topic };
    case "cliche":
      return { kind: "cliche", id: reason.cliche };
    case "fluff":
      return prefs.foldAt === null ? undefined : { kind: "fluff", at: prefs.foldAt };
    case "manual":
      return undefined;
  }
}

/** What a fold bar names as the reason for a category, topic or cliché fold. */
function foldLabel(reason: FoldReason): string {
  if (reason.kind === "category") return CATEGORY_LABELS[reason.category].label;
  if (reason.kind === "topic") return `“${reason.topic}”`;
  if (reason.kind === "cliche") {
    const c = CLICHE_LABELS[reason.cliche];
    return `${c.emoji} ${c.label}`;
  }
  return "";
}

/** One block of the breakdown: a bold title, what it means, then its content. */
function section(title: string, hint: string, ...children: (Node | false | "")[]): HTMLElement {
  return h(
    "div",
    { class: "section" },
    h(
      "p",
      { class: "section-title" },
      h("strong", null, title),
      h("span", { class: "muted" }, ` · ${hint}`),
    ),
    ...children,
  );
}

/**
 * Why a cliché chip is there: how sure Jev is, or, for broetry, what code measured. Broetry is
 * counted, not guessed, so a percentage would be a number from a different question.
 */
function evidence(analysis: Analysis, id: ClicheId): string {
  if (id === "broetry") {
    const lines = analysis.lines;
    return lines
      ? `measured: ${lines.count} lines, ${lines.avgChars} characters each on average`
      : "measured in the text";
  }
  const sure = id === "ai" ? analysis.ai.likelihood : analysis.signals[id];
  return `${Math.round(sure * 100)}% sure`;
}

/** The extension's icon, small, so a folded post says who folded it. */
function cloud(): Element {
  const svg = new DOMParser().parseFromString(cloudSvg, "image/svg+xml").documentElement;
  svg.setAttribute("class", "cloud");
  svg.setAttribute("aria-hidden", "true");
  svg.querySelector("title")?.remove();
  return document.importNode(svg, true);
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

function copyVerdict(button: HTMLButtonElement, index: number): void {
  const verdict = verdictFor(index);
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
