import { storage } from "#imports";
import {
  DEFAULTS,
  migrations,
  publicSettingsItem,
  type Settings,
  toPublic,
  VERSION,
} from "./settings";

/*
 * The settings with the API key. Only the background worker and the popup import this module;
 * the LinkedIn content script must not (see publicSettingsItem in settings.ts).
 */

/**
 * `local:` on purpose: the key stays on this device and is never synced to the user's
 * Google account. Only the background worker and the popup read this item.
 */
export const settingsItem = storage.defineItem<Settings>("local:settings", {
  fallback: DEFAULTS,
  version: VERSION,
  migrations,
});

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await settingsItem.getValue()), ...patch };
  await settingsItem.setValue(next);
  await publicSettingsItem.setValue(toPublic(next));
  return next;
}
