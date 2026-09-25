/**
 * Bump whenever a question in rubric.ts or a weight in scoring.ts changes, so cached results
 * from the previous rubric are ignored instead of being shown next to fresh ones.
 *
 * Kept in its own module so the content script can read it without bundling the rubric.
 */
export const RUBRIC_VERSION = 5;
