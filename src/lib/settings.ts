import { storage } from "#imports";
import { detectProvider, type ProviderId } from "./analysis/providers";
import {
  CATEGORY_IDS,
  type CategoryId,
  type Topic,
  TROPE_IDS,
  type TropeId,
} from "./analysis/types";

export type CategoryMode = "want" | "hide";

/**
 * What a badge shows and what gets folded. Two separate things, on purpose:
 * - tropes are clichés that annoy everyone; one switched off neither shows nor counts;
 * - categories are what a post is about; the reader marks the ones they want or want folded.
 */
export interface DisplayPrefs {
  showIndex: boolean;
  /** The 🤖 chip. Off also takes AI style out of the index. */
  showAi: boolean;
  /** The category next to the score. */
  showCategory: boolean;
  /** Stored as "off" rather than "on", so tropes added later start on. */
  hiddenTropes: TropeId[];
  /** Only categories the reader marked; everything else is neutral. */
  categories: Partial<Record<CategoryId, CategoryMode>>;
  /** The reader's own categories, asked about in the same request. */
  topics: Topic[];
  /** Fold posts at or above this Fluff Index. `null` never folds on fluff alone. */
  foldAt: number | null;
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
  showAi: true,
  showCategory: true,
  hiddenTropes: [],
  categories: {},
  topics: [],
  foldAt: 85,
};

export const DEFAULTS: Settings = { apiKey: "", enabled: true, display: DEFAULT_DISPLAY };

/**
 * Every shape the settings ever had becomes the current one: known fields are kept, fields
 * from older versions (genre sliders, trope weights, a custom rule) are dropped, and ids that
 * no longer exist are filtered out.
 */
export function normalizeDisplay(old: Partial<DisplayPrefs> | undefined): DisplayPrefs {
  const d = { ...DEFAULT_DISPLAY, ...(old ?? {}) };
  const categories: DisplayPrefs["categories"] = {};
  for (const [id, mode] of Object.entries(d.categories ?? {})) {
    if ((CATEGORY_IDS as readonly string[]).includes(id) && (mode === "want" || mode === "hide")) {
      categories[id as CategoryId] = mode;
    }
  }
  return {
    showIndex: d.showIndex !== false,
    showAi: d.showAi !== false,
    showCategory: d.showCategory !== false,
    hiddenTropes: (d.hiddenTropes ?? []).filter((id) => TROPE_IDS.includes(id)),
    categories,
    topics: Array.isArray(d.topics)
      ? d.topics.filter(
          (t) => typeof t?.label === "string" && (t.mode === "want" || t.mode === "hide"),
        )
      : [],
    foldAt: typeof d.foldAt === "number" || d.foldAt === null ? d.foldAt : DEFAULT_DISPLAY.foldAt,
  };
}

function normalize<T extends { display?: Partial<DisplayPrefs> }>(old: T) {
  const { customRule: _rule, ...rest } = old as T & { customRule?: string };
  return { ...rest, display: normalizeDisplay(old.display) };
}

export const VERSION = 7;
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
