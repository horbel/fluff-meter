import { CATEGORY_IDS } from "./analysis/types";
import type { DisplayPrefs } from "./settings";

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
 * One-click starting points for the category marks. Presets only touch categories: clichés
 * annoy everyone the same way, so they stay as the reader left them.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: "default",
    emoji: "⚖️",
    label: "Default",
    blurb: "Every category is neutral. Only pure fluff gets folded.",
    categories: {},
  },
  {
    id: "engineer",
    emoji: "🛠️",
    label: "Engineer",
    blurb: "Know-how and news first. Job updates, events and promo folded.",
    categories: {
      know_how: "want",
      news: "want",
      career_moves: "hide",
      events: "hide",
      promo: "hide",
      job_hunt: "hide",
    },
  },
  {
    id: "recruiter",
    emoji: "🤝",
    label: "Recruiter",
    blurb: "Hiring, job hunts and career moves first. Promo folded.",
    categories: { hiring: "want", job_hunt: "want", career_moves: "want", promo: "hide" },
  },
  {
    id: "job-seeker",
    emoji: "🔎",
    label: "Job seeker",
    blurb: "Openings and know-how first. Promo and life lessons folded.",
    categories: { hiring: "want", know_how: "want", promo: "hide", stories: "hide" },
  },
];

/** The preset the category marks match exactly, if any. */
export function activePreset(categories: DisplayPrefs["categories"]): Preset | undefined {
  return PRESETS.find((preset) =>
    CATEGORY_IDS.every((id) => preset.categories[id] === categories[id]),
  );
}
