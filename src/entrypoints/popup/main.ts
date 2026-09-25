import { CATEGORY_LABELS, TROPE_LABELS, VERDICTS, verdictFor } from "@/lib/analysis/labels";
import { detectProvider, PROVIDERS } from "@/lib/analysis/providers";
import { MAX_TOPIC_CHARS, MAX_TOPICS } from "@/lib/analysis/rubric";
import { CATEGORY_IDS, type Topic, TROPE_IDS } from "@/lib/analysis/types";
import { REPO_URL } from "@/lib/constants";
import { RemoteError, send } from "@/lib/messages";
import { activePreset, PRESETS } from "@/lib/presets";
import {
  type CategoryMode,
  type DisplayPrefs,
  modeOf,
  type Settings,
  saveSettings,
  settingsItem,
} from "@/lib/settings";
import { type DailyStats, dailyStatsItem, summarize } from "@/lib/stats";
import { h } from "@/lib/ui/dom";
import { gauge } from "@/lib/ui/gauge";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const enabled = $<HTMLInputElement>("enabled");
const modeCard = $("mode");
const form = $<HTMLFormElement>("key-form");
const keyInput = $<HTMLInputElement>("api-key");
const reveal = $<HTMLButtonElement>("reveal");
const detected = $("detected");
const saveButton = $<HTMLButtonElement>("save");
const removeButton = $<HTMLButtonElement>("remove");
const status = $("status");
const keySummary = $("key-summary");
const keyLabel = $("key-label");
const keyChange = $<HTMLButtonElement>("key-change");
const statsCard = $("stats");
const showIndex = $<HTMLInputElement>("show-index");
const showCategory = $<HTMLInputElement>("show-category");
const presetsBox = $("presets");
const presetName = $("preset-name");
const presetBlurb = $("preset-blurb");
const foldBox = $("fold");
const categoriesBox = $("categories");
const topicsBox = $("topics");
const addTopic = $<HTMLButtonElement>("add-topic");
const tropesBox = $("tropes");

function setStatus(text: string, tone: "info" | "ok" | "error" = "info") {
  status.textContent = text;
  status.dataset.tone = tone;
}

let editingKey = false;

function renderMode(settings: Settings) {
  const mode = modeOf(settings);
  modeCard.dataset.kind = mode.kind;
  modeCard.textContent =
    mode.kind === "demo"
      ? "Demo · random numbers, add a key below"
      : `Live · Jev via ${PROVIDERS[mode.provider].label}`;
  removeButton.hidden = !settings.apiKey;

  // With a key saved, the card shrinks to one line; "Change" brings the form back.
  const compact = mode.kind === "live" && !editingKey;
  keySummary.hidden = !compact;
  form.hidden = compact;
  if (mode.kind === "live") {
    keyLabel.replaceChildren(
      `🔑 ${PROVIDERS[mode.provider].label} key `,
      h("code", null, `····${settings.apiKey.trim().slice(-4)}`),
    );
  }
}

function renderDetected() {
  const key = keyInput.value.trim();
  const provider = key ? PROVIDERS[detectProvider(key)].label : "";
  detected.textContent = key
    ? `Looks like ${/^[AEIOU]/.test(provider) ? "an" : "a"} ${provider} key.`
    : "";
}

const PERIODS = [
  { days: 1, tab: "Today", report: "today", versus: "vs yesterday" },
  { days: 7, tab: "7 days", report: "this week", versus: "vs previous week" },
  { days: 30, tab: "30 days", report: "this month", versus: "vs previous 30 days" },
] as const;
let period: (typeof PERIODS)[number] = PERIODS[1];

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Jev is cheap enough that cents need more than two decimals. */
const formatCost = (usd: number) =>
  usd === 0 ? "$0" : usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;

/** A labelled list of shares with bars, e.g. "🙏 Humblebrag ▇▇▁ 23%". */
function shareList(
  title: string,
  rows: { label: string; share: number }[],
  tone: "fluff" | "neutral" = "fluff",
) {
  return h(
    "div",
    { class: `share share--${tone}` },
    h("p", { class: "stats-subtitle muted" }, title),
    h(
      "ul",
      { class: "genres" },
      ...rows.map(({ label, share }) =>
        h(
          "li",
          null,
          h("span", null, label),
          h("span", { class: "genre-bar" }, h("span", { style: `width:${pct(share)}` })),
          h("span", { class: "muted" }, pct(share)),
        ),
      ),
    ),
  );
}

function renderStats(settings: Settings, daily: DailyStats) {
  const tabs = h(
    "div",
    { class: "tabs", role: "tablist" },
    ...PERIODS.map((p) => {
      const tab = h(
        "button",
        { type: "button", role: "tab", class: "tab", "aria-selected": String(p === period) },
        p.tab,
      );
      tab.addEventListener("click", () => {
        period = p;
        renderStats(settings, daily);
      });
      return tab;
    }),
  );
  const header = h(
    "div",
    { class: "stats-head" },
    h("p", { class: "stats-title muted" }, "Your feed"),
    tabs,
  );

  if (modeOf(settings).kind === "demo") {
    statsCard.replaceChildren(
      header,
      h("p", { class: "muted" }, "Add a key and your feed stats show up here, day by day."),
    );
    return;
  }

  const summary = summarize(daily, period.days);
  if (!summary.posts) {
    statsCard.replaceChildren(
      header,
      h("p", { class: "muted" }, "No posts scored in this period yet. Scroll your feed."),
    );
    return;
  }

  const verdict = verdictFor(summary.avgIndex);
  const trend = summary.previousAvg === undefined ? null : summary.avgIndex - summary.previousAvg;
  const topTropes = summary.tropes.slice(0, 5);
  const topGenres = summary.categories.slice(0, 4);

  const copy = h("button", { type: "button", class: "primary small" }, "Copy report");
  copy.addEventListener("click", async () => {
    const tropes = topTropes
      .slice(0, 2)
      .map(({ id, share }) => `${pct(share)} ${TROPE_LABELS[id].label.toLowerCase()}`);
    const genre = topGenres[0] ? CATEGORY_LABELS[topGenres[0].id] : undefined;
    // "as a 🛠️ Engineer": the preset is part of the joke, and of the invite to compare.
    const preset = activePreset(settings.display.categories);
    const lens = preset && preset.id !== "default" ? ` (as a ${preset.emoji} ${preset.label})` : "";
    const parts = [
      `${summary.avgIndex}% fluff ${verdict.emoji}`,
      `${pct(summary.aiShare)} reads like AI`,
      ...tropes,
    ];
    await navigator.clipboard.writeText(
      `My LinkedIn feed ${period.report}${lens}: ${parts.join(", ")}.${genre ? ` Top genre: ${genre.emoji} ${genre.label}.` : ""} ${summary.posts} posts scored by Jev. Measure yours: ${REPO_URL}`,
    );
    copy.textContent = "Copied ✓";
  });
  const reset = h("button", { type: "button", class: "secondary small" }, "Reset");
  reset.addEventListener("click", async () => {
    await dailyStatsItem.setValue({});
  });

  statsCard.replaceChildren(
    header,
    h(
      "div",
      { class: "stats-hero", style: `--hue:${verdict.hue}` },
      gauge(summary.avgIndex, !matchMedia("(prefers-reduced-motion: reduce)").matches, 64),
      h("span", { class: "stats-number" }, `${summary.avgIndex}%`),
      h("span", { class: "stats-verdict" }, `${verdict.emoji} ${verdict.label}`),
    ),
    h(
      "p",
      { class: "muted" },
      trend === null
        ? ""
        : `${trend > 0 ? `▲ ${trend}` : trend < 0 ? `▼ ${-trend}` : "Same"} ${period.versus} · `,
      `${summary.posts} posts · 🤖 ${pct(summary.aiShare)} read like AI`,
    ),
    ...(summary.folded > 0
      ? [
          h(
            "p",
            { class: "saved" },
            `🙈 ${summary.folded} folded`,
            h(
              "span",
              { class: "muted" },
              summary.minutesSaved > 0
                ? ` · about ${summary.minutesSaved} min not spent on them`
                : "",
            ),
          ),
        ]
      : []),
    h(
      "p",
      { class: "muted cost" },
      `🪙 ${summary.tokens.toLocaleString("en-US")} tokens · ~${formatCost(summary.cost)} at $0.042 per 1M`,
    ),
    ...(topTropes.length === 0
      ? []
      : [
          shareList(
            "Clichés",
            topTropes.map(({ id, share }) => ({
              label: `${TROPE_LABELS[id].emoji} ${TROPE_LABELS[id].label}`,
              share,
            })),
          ),
        ]),
    shareList(
      "Categories",
      topGenres.map(({ id, share }) => ({
        label: `${CATEGORY_LABELS[id].emoji} ${CATEGORY_LABELS[id].label}`,
        share,
      })),
      "neutral",
    ),
    h("div", { class: "actions" }, copy, reset),
  );
}

/** A row of toggle buttons where exactly one is pressed. */
function segmented<T>(
  options: { value: T; label: string; title: string }[],
  current: T,
  onPick: (value: T) => void,
  className = "segmented",
): HTMLElement {
  const box = h("div", { class: className, role: "radiogroup" });
  const paint = (value: T) => {
    for (const [i, button] of [...box.children].entries()) {
      button.setAttribute("aria-checked", String(options[i]?.value === value));
    }
  };
  for (const option of options) {
    const button = h(
      "button",
      { type: "button", role: "radio", title: option.title, "aria-label": option.title },
      option.label,
    );
    button.addEventListener("click", () => {
      paint(option.value);
      onPick(option.value);
    });
    box.append(button);
  }
  paint(current);
  return box;
}

/**
 * Two toggles, ⭐ and 🙈. Neither pressed means neutral, which is where every category starts,
 * so an untouched list looks untouched. `required` keeps one pressed (topics always have a mode).
 */
function marks(
  label: string,
  current: CategoryMode | undefined,
  required: boolean,
  onChange: (mode: CategoryMode | undefined) => void,
): HTMLElement {
  let mode = current;
  const box = h("div", { class: "marks-toggle" });
  const buttons = (
    [
      ["want", "⭐", `Want ${label}`],
      ["hide", "🙈", `Fold ${label}`],
    ] as const
  ).map(([value, emoji, title]) => {
    const button = h(
      "button",
      { type: "button", class: `mark mark--${value}`, title, "aria-label": title },
      emoji,
    );
    button.addEventListener("click", () => {
      const next = mode === value ? (required ? value : undefined) : value;
      if (next === mode) return;
      mode = next;
      paint();
      onChange(mode);
    });
    return [value, button] as const;
  });
  const paint = () => {
    for (const [value, button] of buttons)
      button.setAttribute("aria-pressed", String(mode === value));
  };
  box.append(...buttons.map(([, b]) => b));
  paint();
  return box;
}

const FOLD_OPTIONS = [
  { value: null, label: "Never", title: "Never fold on fluff alone" },
  ...VERDICTS.slice(0, 2).map((v, i) => ({
    value: v.min,
    label: i === 0 ? `${v.emoji} ${v.label}` : `${v.emoji} ${v.label} too`,
    title: `Fold posts at ${v.min}% fluff and above`,
  })),
];

function renderDisplay(settings: Settings) {
  let display = settings.display;
  const save = (patch: Partial<DisplayPrefs>) => {
    display = { ...display, ...patch };
    void saveSettings({ display });
    if ("categories" in patch) paintPreset();
  };
  const paintPreset = () => {
    const active = activePreset(display.categories);
    presetName.textContent = active ? `· ${active.emoji} ${active.label}` : "· Custom";
    presetBlurb.textContent = active?.blurb ?? "Your own mix. Pick a preset to start over.";
    for (const [i, button] of [...presetsBox.children].entries()) {
      button.setAttribute("aria-pressed", String(PRESETS[i] === active));
    }
  };

  presetsBox.replaceChildren(
    ...PRESETS.map((preset) => {
      const button = h(
        "button",
        { type: "button", class: "preset", title: preset.blurb },
        h("span", { class: "preset-emoji", "aria-hidden": "true" }, preset.emoji),
        preset.label,
      );
      button.addEventListener("click", () => {
        save({ categories: { ...preset.categories } });
        renderDisplay({ ...settings, display });
      });
      return button;
    }),
  );
  paintPreset();

  foldBox.replaceChildren(
    segmented(
      FOLD_OPTIONS,
      display.foldAt,
      (foldAt) => save({ foldAt }),
      "segmented segmented--wide",
    ),
  );

  categoriesBox.replaceChildren(
    ...CATEGORY_IDS.map((id) => {
      const { emoji, label } = CATEGORY_LABELS[id];
      const row = h(
        "div",
        { class: "mark-row", "data-mode": display.categories[id] ?? "" },
        h("span", { class: "mark-label" }, `${emoji} ${label}`),
        marks(label, display.categories[id], false, (mode) => {
          row.dataset.mode = mode ?? "";
          const categories = { ...display.categories };
          if (mode) categories[id] = mode;
          else delete categories[id];
          save({ categories });
        }),
      );
      return row;
    }),
  );

  renderTopics(display.topics, (topics) => save({ topics }));

  tropesBox.replaceChildren(
    ...TROPE_IDS.map((id) => {
      const t = TROPE_LABELS[id];
      return check(`${t.emoji} ${t.label}`, t.hint, !display.hiddenTropes.includes(id), (on) =>
        save({
          hiddenTropes: on
            ? display.hiddenTropes.filter((x) => x !== id)
            : [...new Set([...display.hiddenTropes, id])],
        }),
      );
    }),
    check(
      "🤖 Reads like AI",
      "Em dashes, stock phrases, template structure",
      display.showAi,
      (on) => save({ showAi: on }),
    ),
  );

  showIndex.checked = display.showIndex;
  showIndex.onchange = () => save({ showIndex: showIndex.checked });
  showCategory.checked = display.showCategory;
  showCategory.onchange = () => save({ showCategory: showCategory.checked });
}

function check(label: string, hint: string, on: boolean, onChange: (on: boolean) => void) {
  const input = h("input", { type: "checkbox" });
  input.checked = on;
  input.addEventListener("change", () => onChange(input.checked));
  return h(
    "label",
    { class: "check", title: hint },
    input,
    h("span", null, label),
    h("span", { class: "check-hint muted" }, hint),
  );
}

/**
 * Topic rows. Saved on "change" (blur or Enter), not on every keystroke: each save re-scores
 * the posts on screen.
 */
function renderTopics(initial: Topic[], onSave: (topics: Topic[]) => void) {
  let topics = initial.map((t) => ({ ...t }));
  const commit = () => {
    const clean = topics
      .map((t) => ({ ...t, label: t.label.replace(/\s+/g, " ").trim() }))
      .filter((t) => t.label);
    onSave(clean);
  };
  const draw = () => {
    topicsBox.replaceChildren(
      ...topics.map((topic, i) => {
        const input = h("input", {
          type: "text",
          class: "topic-input",
          maxlength: MAX_TOPIC_CHARS,
          placeholder: "e.g. Rust",
          value: topic.label,
          "aria-label": "Topic",
        });
        input.addEventListener("change", () => {
          topic.label = input.value;
          commit();
        });
        const remove = h(
          "button",
          { type: "button", class: "icon-button small-icon", "aria-label": "Remove topic" },
          "✕",
        );
        remove.addEventListener("click", () => {
          topics = topics.filter((_, j) => j !== i);
          commit();
          draw();
        });
        return h(
          "div",
          { class: "topic-row" },
          input,
          marks("posts about this", topic.mode, true, (mode) => {
            if (!mode) return;
            topic.mode = mode;
            commit();
          }),
          remove,
        );
      }),
    );
    addTopic.hidden = topics.length >= MAX_TOPICS;
  };
  addTopic.onclick = () => {
    topics = [...topics, { label: "", mode: "want" }];
    draw();
    topicsBox.querySelector<HTMLInputElement>(".topic-row:last-child input")?.focus();
  };
  draw();
}

async function refresh() {
  const [settings, daily] = await Promise.all([settingsItem.getValue(), dailyStatsItem.getValue()]);
  enabled.checked = settings.enabled;
  renderMode(settings);
  renderStats(settings, daily);
  return settings;
}

enabled.addEventListener("change", () => void saveSettings({ enabled: enabled.checked }));

keyInput.addEventListener("input", renderDetected);

reveal.addEventListener("click", () => {
  const show = keyInput.type === "password";
  keyInput.type = show ? "text" : "password";
  reveal.setAttribute("aria-label", show ? "Hide key" : "Show key");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiKey = keyInput.value.trim();
  if (!apiKey) {
    setStatus("Paste a key first, or leave it empty to stay in demo mode.", "error");
    return;
  }
  saveButton.disabled = true;
  setStatus("Testing the key…");
  try {
    const { model } = await send({ type: "test-key", apiKey });
    await saveSettings({ apiKey });
    editingKey = false;
    setStatus(`Saved. ${model} is answering.`, "ok");
  } catch (err) {
    const error = err instanceof RemoteError ? err.error : undefined;
    if (error?.code === "network" || error?.code === "rate_limited") {
      // The key might be fine; don't make the user retype it later.
      await saveSettings({ apiKey });
      setStatus(`Saved, but couldn't verify it: ${error.message}`, "error");
    } else {
      setStatus(error?.message ?? "Couldn't test the key.", "error");
    }
  } finally {
    saveButton.disabled = false;
    await refresh();
  }
});

keyChange.addEventListener("click", async () => {
  editingKey = true;
  renderMode(await settingsItem.getValue());
  keyInput.focus();
});

removeButton.addEventListener("click", async () => {
  await saveSettings({ apiKey: "" });
  keyInput.value = "";
  renderDetected();
  setStatus("Key removed. Back to demo mode.");
  await refresh();
});

dailyStatsItem.watch(() => void refresh());

const initial = await refresh();
keyInput.value = initial.apiKey;
renderDisplay(initial);
renderDetected();
