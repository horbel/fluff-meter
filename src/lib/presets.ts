import { CATEGORY_IDS, GOOD_SIGN_IDS } from "./analysis/types";
import { DEFAULT_DISPLAY, type DisplayPrefs } from "./settings";

export interface Preset {
  id: string;
  emoji: string;
  label: string;
  /** One line on who it's for. */
  blurb: string;
  /** Categories to mark; the rest are neutral. */
  categories: DisplayPrefs["categories"];
}

/**
 * One-click starting points. A preset starts the rules over: its categories, every good sign
 * always shown, pure fluff folded, no cliché folded. The reader's own topics stay, since they
 * took typing.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: "default",
    emoji: "⚖️",
    label: "Default",
    blurb: "Only pure fluff folds. Posts with a good sign always show.",
    categories: {},
  },
  {
    id: "engineer",
    emoji: "🛠️",
    label: "Engineer",
    blurb: "Know-how and news always show. Job updates, thank-yous, events and promo fold.",
    categories: {
      know_how: "want",
      news: "want",
      career_moves: "hide",
      thanks: "hide",
      events: "hide",
      promo: "hide",
      job_hunt: "hide",
    },
  },
  {
    id: "recruiter",
    emoji: "🤝",
    label: "Recruiter",
    blurb: "Hiring, job hunts and career moves always show. Promo folds.",
    categories: { hiring: "want", job_hunt: "want", career_moves: "want", promo: "hide" },
  },
  {
    id: "job-seeker",
    emoji: "🔎",
    label: "Job seeker",
    blurb: "Openings and know-how always show. Promo and life lessons fold.",
    categories: { hiring: "want", know_how: "want", promo: "hide", stories: "hide" },
  },
];

export function applyPreset(prefs: DisplayPrefs, preset: Preset): DisplayPrefs {
  return {
    ...prefs,
    categories: { ...preset.categories },
    wantGood: [...GOOD_SIGN_IDS],
    foldTropes: [],
    foldAt: DEFAULT_DISPLAY.foldAt,
  };
}

/** The preset the reader's rules match exactly, if any. Topics don't count. */
export function activePreset(
  prefs: Pick<DisplayPrefs, "categories" | "wantGood" | "foldTropes" | "foldAt">,
): Preset | undefined {
  const untouched =
    prefs.foldAt === DEFAULT_DISPLAY.foldAt &&
    prefs.foldTropes.length === 0 &&
    GOOD_SIGN_IDS.every((id) => prefs.wantGood.includes(id));
  return untouched
    ? PRESETS.find((preset) =>
        CATEGORY_IDS.every((id) => preset.categories[id] === prefs.categories[id]),
      )
    : undefined;
}
