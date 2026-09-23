import { CATEGORY_LABELS, TROPE_LABELS, verdictFor } from "@/lib/analysis/labels";
import { detectProvider, PROVIDERS } from "@/lib/analysis/providers";
import { TROPE_SIGNAL, TROPE_WEIGHTS } from "@/lib/analysis/scoring";
import { CATEGORY_IDS, TROPE_IDS } from "@/lib/analysis/types";
import { REPO_URL } from "@/lib/constants";
import { RemoteError, send } from "@/lib/messages";
import { activePreset, PRESETS, presetOverrides } from "@/lib/presets";
import {
  type DisplayPrefs,
  modeOf,
  type Settings,
  saveSettings,
  settingsItem,
} from "@/lib/settings";
import { type DailyStats, dailyStatsItem, summarize } from "@/lib/stats";
import { h } from "@/lib/ui/dom";

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
const presetsBox = $("presets");
const presetName = $("preset-name");
const presetBlurb = $("preset-blurb");
const categoriesBox = $("categories");
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
function shareList(title: string, rows: { label: string; share: number }[]) {
  return h(
    "div",
    null,
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
    const preset = activePreset(settings.display);
    const lens = preset && preset.id !== "default" ? ` (as a ${preset.emoji} ${preset.label})` : "";
    const parts = [
      `${summary.avgIndex}% bullshit ${verdict.emoji}`,
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
      h("span", { class: "stats-number" }, `${summary.avgIndex}%`),
      h("span", null, `${verdict.emoji} ${verdict.label}`),
    ),
    h(
      "p",
      { class: "muted" },
      trend === null
        ? ""
        : `${trend > 0 ? `▲ ${trend}` : trend < 0 ? `▼ ${-trend}` : "Same"} ${period.versus} · `,
      `${summary.posts} posts · 🤖 ${pct(summary.aiShare)} read like AI · worst ${summary.worst}%`,
    ),
    h(
      "p",
      { class: "muted cost" },
      `🪙 ${summary.tokens.toLocaleString("en-US")} tokens · ~${formatCost(summary.cost)} at $0.042 per 1M`,
    ),
    ...(topTropes.length === 0
      ? []
      : [
          shareList(
            "Tropes",
            topTropes.map(({ id, share }) => ({
              label: `${TROPE_LABELS[id].emoji} ${TROPE_LABELS[id].label}`,
              share,
            })),
          ),
        ]),
    shareList(
      "Genres",
      topGenres.map(({ id, share }) => ({
        label: `${CATEGORY_LABELS[id].emoji} ${CATEGORY_LABELS[id].label}`,
        share,
      })),
    ),
    h("div", { class: "actions" }, copy, reset),
  );
}

interface WeightRow {
  label: string;
  shown: boolean;
  /** 0..1 */
  weight: number;
  onShow: (shown: boolean) => void;
  onWeight: (weight: number) => void;
}

/** One line per tag: show it or not, and how much bullshit it is for the reader. */
function weightRow(row: WeightRow): HTMLElement {
  const show = h("input", { type: "checkbox", "aria-label": `Show ${row.label}` });
  show.checked = row.shown;
  show.addEventListener("change", () => {
    line.classList.toggle("is-hidden", !show.checked);
    row.onShow(show.checked);
  });

  const value = h("span", { class: "weight-value" }, pct(row.weight));
  // Green at 0% ("fine by me"), red at 100% ("pure bullshit").
  const paint = (percent: number) => {
    const color = `hsl(${Math.round(140 - 1.4 * percent)} 68% 46%)`;
    slider.style.setProperty("--thumb", color);
    value.style.color = percent > 0 ? color : "";
  };
  const slider = h("input", {
    type: "range",
    min: 0,
    max: 100,
    step: 5,
    value: Math.round(row.weight * 100),
    "aria-label": `How much bullshit ${row.label} is for you`,
  });
  slider.addEventListener("input", () => {
    value.textContent = `${slider.value}%`;
    paint(Number(slider.value));
  });
  paint(Math.round(row.weight * 100));
  // Save on release: every save re-renders the badges on open LinkedIn tabs.
  slider.addEventListener("change", () => row.onWeight(Number(slider.value) / 100));

  const line = h(
    "div",
    { class: row.shown ? "weight-row" : "weight-row is-hidden" },
    show,
    h("span", { class: "weight-label", title: row.label }, row.label),
    slider,
    value,
  );
  return line;
}

function renderDisplay(settings: Settings) {
  let display = settings.display;
  const save = (patch: Partial<DisplayPrefs>) => {
    display = { ...display, ...patch };
    void saveSettings({ display });
    if ("tropeWeights" in patch || "categoryWeights" in patch) paintPreset();
  };
  const paintPreset = () => {
    const active = activePreset(display);
    presetName.textContent = active ? `· ${active.emoji} ${active.label}` : "· Custom";
    presetBlurb.textContent = active?.blurb ?? "Your own mix. Pick a preset to start over.";
    for (const [i, button] of [...presetsBox.children].entries()) {
      button.setAttribute("aria-pressed", String(PRESETS[i] === active));
    }
  };
  const toggle = <T extends string>(list: readonly T[], id: T, shown: boolean) =>
    shown ? list.filter((x) => x !== id) : [...new Set([...list, id])];
  /** Stores only overrides, so improving a default later reaches everyone who didn't touch it. */
  const override = <K extends string>(
    map: Partial<Record<K, number>>,
    id: K,
    weight: number,
    fallback: number,
  ) => {
    const next = { ...map };
    if (Math.abs(weight - fallback) < 0.001) delete next[id];
    else next[id] = weight;
    return next;
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
        save(presetOverrides(preset));
        renderDisplay({ ...settings, display });
      });
      return button;
    }),
  );

  paintPreset();

  showIndex.checked = display.showIndex;
  showIndex.onchange = () => save({ showIndex: showIndex.checked });

  tropesBox.replaceChildren(
    ...TROPE_IDS.map((id) => {
      const signal = TROPE_SIGNAL[id];
      return weightRow({
        label: `${TROPE_LABELS[id].emoji} ${TROPE_LABELS[id].label}`,
        shown: !display.hiddenTropes.includes(id),
        weight: display.tropeWeights[signal] ?? TROPE_WEIGHTS[signal],
        onShow: (shown) => save({ hiddenTropes: toggle(display.hiddenTropes, id, shown) }),
        onWeight: (w) =>
          save({ tropeWeights: override(display.tropeWeights, signal, w, TROPE_WEIGHTS[signal]) }),
      });
    }),
    weightRow({
      label: "🤖 AI-written",
      shown: display.showAi,
      weight: display.tropeWeights.ai ?? TROPE_WEIGHTS.ai,
      onShow: (shown) => save({ showAi: shown }),
      onWeight: (w) =>
        save({ tropeWeights: override(display.tropeWeights, "ai", w, TROPE_WEIGHTS.ai) }),
    }),
  );

  categoriesBox.replaceChildren(
    ...CATEGORY_IDS.map((id) =>
      weightRow({
        label: `${CATEGORY_LABELS[id].emoji} ${CATEGORY_LABELS[id].label}`,
        shown: !display.hiddenCategories.includes(id),
        weight: display.categoryWeights[id] ?? 0,
        onShow: (shown) => save({ hiddenCategories: toggle(display.hiddenCategories, id, shown) }),
        onWeight: (w) => save({ categoryWeights: override(display.categoryWeights, id, w, 0) }),
      }),
    ),
  );
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
