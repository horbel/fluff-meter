/**
 * 🥚 The legends list. Posts by these profiles are scored like any other, and get a ✨ Legend
 * chip on top.
 *
 * Ids are the part of the profile URL after linkedin.com: `in:<slug>` for people,
 * `company:<slug>` for pages. Lowercase.
 */
export const LEGENDS: ReadonlySet<string> = new Set([
  "in:aliaksei-horbel-5b42a1113", // the author of this extension, obviously
]);

export function isLegend(author: string | undefined): boolean {
  return !!author && LEGENDS.has(author.toLowerCase());
}
