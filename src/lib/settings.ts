import { storage } from "#imports";
import { detectProvider, type ProviderId } from "./analysis/providers";
import {
  CATEGORY_IDS,
  type CategoryId,
  CLICHE_IDS,
  type ClicheId,
  GOOD_SIGN_IDS,
  type GoodSignId,
  type Topic,
  TROPE_IDS,
} from "./analysis/types";

export type CategoryMode = "want" | "hide";

/**
 * The Fluff Index is the same for everyone. Everything else comes down to two verbs:
 * - 🙈 fold: too much fluff, a category or topic, a cliché;
 * - ⭐ always show: a category or topic, a good sign. It always wins over a fold.
 * Plus what the badge shows.
 */
export interface DisplayPrefs {
  /** What the badge shows. */
  showIndex: boolean;
  showCliches: boolean;
  showGood: boolean;
  showCategory: boolean;
  /** Fold posts at or above this Fluff Index. `null` never folds on fluff alone. */
  foldAt: number | null;
  /** Only categories the reader marked; everything else is neutral. */
  categories: Partial<Record<CategoryId, CategoryMode>>;
  /** The reader's own categories, asked about in the same request. */
  topics: Topic[];
  /** Clichés whose posts get folded. Empty by default. */
  foldTropes: ClicheId[];
  /** Good signs whose posts get a star and never fold. */
  wantGood: GoodSignId[];
}

/** Fields of earlier versions, read once when settings are migrated. */
interface LegacyPrefs {
  showAi?: boolean;
  hiddenTropes?: string[];
}

export interface Settings {
  /** Empty means demo mode. */
  apiKey: string;
  /** Badges on or off, without uninstalling. */
  enabled: boolean;
  display: DisplayPrefs;
}

export type Mode = { kind: "demo" } | { kind: "live"; provider: ProviderId };

/** What content scripts get to know: whether to run, in which mode, what to show. Never the key. */
export interface PublicSettings {
  enabled: boolean;
  mode: Mode;
  display: DisplayPrefs;
}

export const DEFAULT_DISPLAY: DisplayPrefs = {
  showIndex: true,
  showCliches: true,
  showGood: true,
  showCategory: true,
  foldAt: 85,
  categories: {},
  topics: [],
  foldTropes: [],
  wantGood: [...GOOD_SIGN_IDS],
};

export const DEFAULTS: Settings = { apiKey: "", enabled: true, display: DEFAULT_DISPLAY };

/**
 * Every shape the settings ever had becomes the current one: known fields are kept, fields
 * from older versions (genre sliders, trope weights, a custom rule) are dropped, and ids that
 * no longer exist are filtered out.
 */
export function normalizeDisplay(
  old: (Partial<DisplayPrefs> & LegacyPrefs) | undefined,
): DisplayPrefs {
  const d = { ...DEFAULT_DISPLAY, ...(old ?? {}) };
  const categories: DisplayPrefs["categories"] = {};
  for (const [id, mode] of Object.entries(d.categories ?? {})) {
    if ((CATEGORY_IDS as readonly string[]).includes(id) && (mode === "want" || mode === "hide")) {
      categories[id as CategoryId] = mode;
    }
  }
  // In 0.3 each cliché chip had its own switch: all of them off means "no cliché chips".
  const allClichesOff =
    d.showAi === false && TROPE_IDS.every((id) => (d.hiddenTropes ?? []).includes(id));
  return {
    showIndex: d.showIndex !== false,
    showCliches: old?.showCliches ?? !allClichesOff,
    showGood: d.showGood !== false,
    showCategory: d.showCategory !== false,
    foldAt: typeof d.foldAt === "number" || d.foldAt === null ? d.foldAt : DEFAULT_DISPLAY.foldAt,
    categories,
    topics: Array.isArray(d.topics)
      ? d.topics.filter(
          (t) => typeof t?.label === "string" && (t.mode === "want" || t.mode === "hide"),
        )
      : [],
    foldTropes: (d.foldTropes ?? []).filter((id) => CLICHE_IDS.includes(id)),
    wantGood: (d.wantGood ?? DEFAULT_DISPLAY.wantGood).filter((id) => GOOD_SIGN_IDS.includes(id)),
  };
}

function normalize<T extends { display?: Partial<DisplayPrefs> }>(old: T) {
  const { customRule: _rule, ...rest } = old as T & { customRule?: string };
  return { ...rest, display: normalizeDisplay(old.display) };
}

export const VERSION = 9;
export const migrations = Object.fromEntries(
  Array.from({ length: VERSION - 1 }, (_, i) => [i + 2, normalize]),
);

/**
 * A key-free mirror of the settings that content scripts watch. The real settings, key included,
 * live in settings-private.ts, which the LinkedIn content script never imports: defining a
 * storage item reads it (to migrate it), so importing it would pull the key into that script.
 */
export const publicSettingsItem = storage.defineItem<PublicSettings>("local:public-settings", {
  fallback: toPublic(DEFAULTS),
  version: VERSION,
  migrations,
});

export function modeOf(settings: Settings): Mode {
  // Tolerate a missing key: storage written by another build of the extension may lack it.
  const key = (settings.apiKey ?? "").trim();
  return key ? { kind: "live", provider: detectProvider(key) } : { kind: "demo" };
}

export function toPublic(settings: Settings): PublicSettings {
  return { enabled: settings.enabled, mode: modeOf(settings), display: settings.display };
}
