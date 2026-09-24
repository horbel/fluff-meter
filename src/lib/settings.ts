import { storage } from "#imports";
import { detectProvider, type ProviderId } from "./analysis/providers";
import type { PersonalWeights } from "./analysis/scoring";
import type { CategoryId, TropeId } from "./analysis/types";

/**
 * What a badge shows and how much each tag counts. Everything is shown by default; weights are
 * stored only when the reader moves a slider away from its default.
 */
export interface DisplayPrefs extends PersonalWeights {
  showIndex: boolean;
  /** The "✍️ Human / 🤖 AI" chip. */
  showAi: boolean;
  /** Stored as "hidden" rather than "shown", so categories and tropes added later start visible. */
  hiddenCategories: CategoryId[];
  hiddenTropes: TropeId[];
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
  hiddenCategories: [],
  hiddenTropes: [],
  tropeWeights: {},
  categoryWeights: {},
};

const DEFAULTS: Settings = { apiKey: "", enabled: true, display: DEFAULT_DISPLAY };

/** Every shape the settings ever had becomes the current one by filling in defaults. */
function normalize<T extends { display?: Partial<DisplayPrefs> }>(old: T) {
  const { customRule: _rule, ...rest } = old as T & { customRule?: string };
  const { taste: _taste, ...display } = (old.display ?? {}) as Partial<DisplayPrefs> & {
    taste?: unknown;
  };
  return { ...rest, display: { ...DEFAULT_DISPLAY, ...display } };
}

const VERSION = 6;
const migrations = Object.fromEntries(
  Array.from({ length: VERSION - 1 }, (_, i) => [i + 2, normalize]),
);

/**
 * `local:` on purpose: the key stays on this device and is never synced to the user's
 * Google account. Only the background worker and the popup read this item.
 */
export const settingsItem = storage.defineItem<Settings>("local:settings", {
  fallback: DEFAULTS,
  version: VERSION,
  migrations,
});

/** A key-free mirror of the settings that content scripts watch. */
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

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await settingsItem.getValue()), ...patch };
  await settingsItem.setValue(next);
  await publicSettingsItem.setValue(toPublic(next));
  return next;
}
