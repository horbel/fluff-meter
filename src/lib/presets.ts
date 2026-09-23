import { type PersonalWeights, TROPE_WEIGHTS, type TropeSignal } from "./analysis/scoring";
import { CATEGORY_IDS, type CategoryId } from "./analysis/types";

export interface Preset extends PersonalWeights {
  id: string;
  emoji: string;
  label: string;
  /** One line on who it's for. */
  blurb: string;
}

/**
 * One-click starting points for the Customize sliders. Weights are full values (0..1), not
 * overrides; anything left out uses the default.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: "default",
    emoji: "⚖️",
    label: "Default",
    blurb: "Calibrated on a real feed. Genres are neutral.",
    tropeWeights: {},
    categoryWeights: {},
  },
  {
    id: "engineer",
    emoji: "🛠️",
    label: "Engineer",
    blurb: "Tech is signal. Job updates, events and motivation are noise.",
    tropeWeights: { routine: 0.8, engagement_bait: 0.5, ai: 0.5 },
    categoryWeights: {
      career_news: 1,
      event: 1,
      job_seeking: 1,
      motivational: 1,
      promo: 0.7,
      personal_story: 0.4,
    },
  },
  {
    id: "recruiter",
    emoji: "🤝",
    label: "Recruiter",
    blurb: "Hiring and career moves are the job. Deep tech is noise.",
    tropeWeights: { routine: 0, humblebrag: 0.15 },
    categoryWeights: { technical: 1, industry_news: 0.4, hot_take: 0.3 },
  },
  {
    id: "pragmatist",
    emoji: "🎯",
    label: "Pragmatist",
    blurb: "Only tech, launches and news count. Everything else is noise.",
    tropeWeights: {
      engagement_bait: 0.6,
      humblebrag: 0.6,
      parable: 0.6,
      truism: 0.6,
      routine: 0.8,
      ai: 0.6,
      hustle: 0.5,
      formatting: 0.4,
      sales_pitch: 0.5,
    },
    categoryWeights: {
      motivational: 1,
      career_news: 1,
      event: 1,
      job_seeking: 1,
      promo: 1,
      personal_story: 0.8,
      hiring: 0.7,
      hot_take: 0.6,
      humor: 0.5,
      other: 0.5,
    },
  },
];

const same = (a: number, b: number) => Math.abs(a - b) < 0.001;

/** The overrides to store for a preset: only values that differ from the defaults. */
export function presetOverrides(preset: Preset): PersonalWeights {
  const tropeWeights: PersonalWeights["tropeWeights"] = {};
  for (const [id, w] of Object.entries(preset.tropeWeights) as [TropeSignal, number][]) {
    if (!same(w, TROPE_WEIGHTS[id])) tropeWeights[id] = w;
  }
  const categoryWeights: PersonalWeights["categoryWeights"] = {};
  for (const [id, w] of Object.entries(preset.categoryWeights) as [CategoryId, number][]) {
    if (!same(w, 0)) categoryWeights[id] = w;
  }
  return { tropeWeights, categoryWeights };
}

/** The preset the current sliders match exactly, if any. */
export function activePreset(weights: PersonalWeights): Preset | undefined {
  return PRESETS.find((preset) => {
    const target = presetOverrides(preset);
    const tropes = Object.keys(TROPE_WEIGHTS) as TropeSignal[];
    return (
      tropes.every((id) =>
        same(
          weights.tropeWeights[id] ?? TROPE_WEIGHTS[id],
          target.tropeWeights[id] ?? TROPE_WEIGHTS[id],
        ),
      ) &&
      CATEGORY_IDS.every((id) =>
        same(weights.categoryWeights[id] ?? 0, target.categoryWeights[id] ?? 0),
      )
    );
  });
}
