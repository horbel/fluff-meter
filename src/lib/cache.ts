import { browser } from "#imports";
import type { Analysis } from "./analysis/types";
import { RUBRIC_VERSION } from "./analysis/version";

/**
 * Results are cached per post text so scrolling back, reloading the feed or seeing the same
 * post twice never pays for a second request. Each entry is its own storage key, so writing
 * one result doesn't rewrite the whole cache.
 */
const PREFIX = `result:v${RUBRIC_VERSION}:`;
const MAX_ENTRIES = 2000;

interface Entry {
  analysis: Analysis;
  at: number;
}

export async function getCached(hash: string): Promise<Analysis | undefined> {
  const key = PREFIX + hash;
  const entry = (await browser.storage.local.get(key))[key] as Entry | undefined;
  return entry?.analysis;
}

export async function putCached(hash: string, analysis: Analysis): Promise<void> {
  await browser.storage.local.set({
    [PREFIX + hash]: { analysis, at: Date.now() } satisfies Entry,
  });
}

/** Drops results from older rubric versions and the oldest entries beyond MAX_ENTRIES. */
export async function pruneCache(): Promise<void> {
  const all = await browser.storage.local.get(null);
  const stale: string[] = [];
  const current: [string, number][] = [];
  for (const [key, value] of Object.entries(all)) {
    if (!key.startsWith("result:")) continue;
    if (!key.startsWith(PREFIX)) stale.push(key);
    else current.push([key, (value as Entry).at ?? 0]);
  }
  if (current.length > MAX_ENTRIES) {
    current.sort((a, b) => a[1] - b[1]);
    stale.push(...current.slice(0, current.length - MAX_ENTRIES).map(([key]) => key));
  }
  if (stale.length) await browser.storage.local.remove(stale);
}
