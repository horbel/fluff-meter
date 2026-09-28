import {
  CATEGORY_LABELS,
  CLICHE_LABELS,
  GOOD_LABELS,
  type TagLabel,
  VERDICTS,
} from "./analysis/labels";
import type { CategoryId, ClicheId, GoodSignId } from "./analysis/types";
import type { DisplayPrefs } from "./settings";

/**
 * The reader's settings, seen as a list of rules. Two verbs: 🙈 fold (to one line) and ⭐ always
 * show (never folded, marked with a star; "star" in code). Rules are made from a chip on a post or
 * from "+ Add" in the popup, and live in the popup as rows with ×.
 */
export type Verb = "fold" | "star";

export type Rule =
  /** Fold at or above this Fluff Index. */
  | { kind: "fluff"; at: number }
  | { kind: "category"; id: CategoryId }
  | { kind: "topic"; label: string }
  /** Clichés can only fold, */
  | { kind: "cliche"; id: ClicheId }
  /** and good signs can only star. */
  | { kind: "good"; id: GoodSignId };

const MODE = { fold: "hide", star: "want" } as const;

/** Every rule of one verb, in the order the popup lists them. */
export function rulesOf(prefs: DisplayPrefs, verb: Verb): Rule[] {
  const mode = MODE[verb];
  return [
    ...(verb === "fold" && prefs.foldAt !== null
      ? [{ kind: "fluff", at: prefs.foldAt } as const]
      : []),
    ...(Object.entries(prefs.categories) as [CategoryId, string][])
      .filter(([, m]) => m === mode)
      .map(([id]) => ({ kind: "category", id }) as const),
    ...prefs.topics
      .filter((t) => t.mode === mode)
      .map((t) => ({ kind: "topic", label: t.label }) as const),
    ...(verb === "fold" ? prefs.foldTropes.map((id) => ({ kind: "cliche", id }) as const) : []),
    ...(verb === "star" ? prefs.wantGood.map((id) => ({ kind: "good", id }) as const) : []),
  ];
}

/** The verb the reader has for this rule's subject, if any (ignores the fluff level). */
export function verbFor(prefs: DisplayPrefs, rule: Rule): Verb | undefined {
  switch (rule.kind) {
    case "fluff":
      return prefs.foldAt === null ? undefined : "fold";
    case "category": {
      const mode = prefs.categories[rule.id];
      return mode === "hide" ? "fold" : mode === "want" ? "star" : undefined;
    }
    case "topic": {
      const mode = prefs.topics.find((t) => sameTopic(t.label, rule.label))?.mode;
      return mode === "hide" ? "fold" : mode === "want" ? "star" : undefined;
    }
    case "cliche":
      return prefs.foldTropes.includes(rule.id) ? "fold" : undefined;
    case "good":
      return prefs.wantGood.includes(rule.id) ? "star" : undefined;
  }
}

/** Adds a rule. A category or topic can have one verb only, so starring it un-folds it. */
export function withRule(prefs: DisplayPrefs, verb: Verb, rule: Rule): DisplayPrefs {
  const clean = withoutRule(prefs, rule);
  switch (rule.kind) {
    case "fluff":
      return { ...clean, foldAt: rule.at };
    case "category":
      return { ...clean, categories: { ...clean.categories, [rule.id]: MODE[verb] } };
    case "topic": {
      // Change a known topic in place: the list, in order, is part of the cache key, so moving
      // it to the end would score every post again.
      const mode = MODE[verb];
      const known = prefs.topics.some((t) => sameTopic(t.label, rule.label));
      return {
        ...prefs,
        topics: known
          ? prefs.topics.map((t) => (sameTopic(t.label, rule.label) ? { ...t, mode } : t))
          : [...prefs.topics, { label: rule.label, mode }],
      };
    }
    case "cliche":
      return { ...clean, foldTropes: [...clean.foldTropes, rule.id] };
    case "good":
      return { ...clean, wantGood: [...clean.wantGood, rule.id] };
  }
}

export function withoutRule(prefs: DisplayPrefs, rule: Rule): DisplayPrefs {
  switch (rule.kind) {
    case "fluff":
      return { ...prefs, foldAt: null };
    case "category": {
      const { [rule.id]: _gone, ...categories } = prefs.categories;
      return { ...prefs, categories };
    }
    case "topic":
      return { ...prefs, topics: prefs.topics.filter((t) => !sameTopic(t.label, rule.label)) };
    case "cliche":
      return { ...prefs, foldTropes: prefs.foldTropes.filter((id) => id !== rule.id) };
    case "good":
      return { ...prefs, wantGood: prefs.wantGood.filter((id) => id !== rule.id) };
  }
}

export function sameRule(a: Rule, b: Rule): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameTopic(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** How a rule reads: "☁️ Too much fluff", "💸 Promo", "🔤 crypto", "🎣 Bait". */
export function ruleLabel(rule: Rule): string {
  switch (rule.kind) {
    case "fluff":
      return "☁️ Too much fluff";
    case "category":
      return `${CATEGORY_LABELS[rule.id].emoji} ${CATEGORY_LABELS[rule.id].label}`;
    case "topic":
      return `🔤 ${rule.label}`;
    case "cliche":
      return `${CLICHE_LABELS[rule.id].emoji} ${CLICHE_LABELS[rule.id].label}`;
    case "good":
      return `${GOOD_LABELS[rule.id].emoji} ${GOOD_LABELS[rule.id].label}`;
  }
}

/** What a rule means, in a sentence, for its row in the popup and the undo line on a post. */
export function ruleSentence(verb: Verb, rule: Rule): string {
  const does = verb === "fold" ? "fold" : "always show";
  switch (rule.kind) {
    case "fluff":
      return `Posts at ${rule.at}% fluff or more ${does}`;
    case "category":
      return `${CATEGORY_LABELS[rule.id].label} posts ${does}`;
    case "topic":
      return `Posts about “${rule.label}” ${does}`;
    case "cliche":
      return `Posts with ${CLICHE_LABELS[rule.id].label.toLowerCase()} ${does}`;
    case "good":
      return `Posts with ${GOOD_LABELS[rule.id].label.toLowerCase()} ${does}`;
  }
}

/** The levels "too much fluff" can mean: the two worst verdicts. */
export const FLUFF_LEVELS = VERDICTS.slice(0, 2).map((v, i) => ({
  at: v.min,
  label: i === 0 ? `${v.label} (${v.min}%+)` : `${v.label} too (${v.min}%+)`,
}));

/** The tag behind a rule, for its hint and example. Categories and topics have none. */
export function ruleTag(rule: Rule): TagLabel | undefined {
  if (rule.kind === "cliche") return CLICHE_LABELS[rule.id];
  if (rule.kind === "good") return GOOD_LABELS[rule.id];
  return undefined;
}
