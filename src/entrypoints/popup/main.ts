import { CATEGORY_LABELS, TROPE_LABELS, tagTooltip, verdictFor } from "@/lib/analysis/labels";
import { detectProvider, PROVIDERS } from "@/lib/analysis/providers";
import { MAX_TOPIC_CHARS, MAX_TOPICS } from "@/lib/analysis/rubric";
import { CATEGORY_IDS, CLICHE_IDS, GOOD_SIGN_IDS } from "@/lib/analysis/types";
import { REPO_URL } from "@/lib/constants";
import { RemoteError, send } from "@/lib/messages";
import { activePreset, applyPreset, PRESETS } from "@/lib/presets";
import {
  FLUFF_LEVELS,
  type Rule,
  ruleLabel,
  ruleSentence,
  rulesOf,
  ruleTag,
  type Verb,
  verbFor,
  withoutRule,
  withRule,
} from "@/lib/rules";
import { type DisplayPrefs, modeOf, type Settings } from "@/lib/settings";
import { saveSettings, settingsItem } from "@/lib/settings-private";
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
const showCliches = $<HTMLInputElement>("show-cliches");
const showGood = $<HTMLInputElement>("show-good");
const showCategory = $<HTMLInputElement>("show-category");
const anatomy = $<HTMLDetailsElement>("anatomy");
const presetsBox = $("presets");
const lists = {
  fold: { rules: $("fold-rules"), sheet: $("fold-sheet"), add: $<HTMLButtonElement>("fold-add") },
  star: { rules: $("star-rules"), sheet: $("star-sheet"), add: $<HTMLButtonElement>("star-add") },
};

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
    const preset = activePreset(settings.display);
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
      `${summary.posts} posts · 📊 ${pct(summary.insightShare)} with real numbers · 🤖 ${pct(summary.aiShare)} read like AI`,
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

interface Offer {
  rule: Rule;
  label: string;
  kind: "fluff" | "about" | "cliche" | "good";
}

/** What "+ Add" offers for a verb, in groups, minus what that verb already has. */
function offers(display: DisplayPrefs, verb: Verb): { title: string; items: Offer[] }[] {
  const fresh = (rule: Rule) => verbFor(display, rule) !== verb;
  const about: Offer[] = CATEGORY_IDS.map((id) => ({ kind: "category", id }) as const)
    .filter(fresh)
    .map((rule) => ({
      rule,
      label: ruleLabel(rule),
      kind: "about",
    }));
  if (verb === "fold") {
    // One rule with a level, picked on its row; here it can only be switched back on.
    const rule = { kind: "fluff", at: FLUFF_LEVELS[0]?.at ?? 85 } as const;
    const fluff: Offer[] =
      display.foldAt === null ? [{ rule, label: ruleLabel(rule), kind: "fluff" }] : [];
    const cliches: Offer[] = CLICHE_IDS.map((id) => ({ kind: "cliche", id }) as const)
      .filter(fresh)
      .map((rule) => ({
        rule,
        label: ruleLabel(rule),
        kind: "cliche",
      }));
    return [
      { title: "Fluff", items: fluff },
      { title: "Categories", items: about },
      { title: "Clichés", items: cliches },
    ];
  }
  const good: Offer[] = GOOD_SIGN_IDS.map((id) => ({ kind: "good", id }) as const)
    .filter(fresh)
    .map((rule) => ({
      rule,
      label: ruleLabel(rule),
      kind: "good",
    }));
  return [
    { title: "Categories", items: about },
    { title: "Good signs", items: good },
  ];
}

function renderDisplay(settings: Settings) {
  let display = settings.display;
  const open: Record<Verb, boolean> = { fold: false, star: false };
  const save = (next: DisplayPrefs) => {
    display = next;
    void saveSettings({ display });
    paint();
  };

  // First time here, with random demo numbers, the badge needs explaining; later it's in the way.
  anatomy.open = modeOf(settings).kind === "demo";

  const row = (verb: Verb, rule: Rule) => {
    const tag = ruleTag(rule);
    const remove = h(
      "button",
      { type: "button", class: "rule-x", "aria-label": `Stop: ${ruleSentence(verb, rule)}` },
      "×",
    );
    remove.addEventListener("click", () => save(withoutRule(display, rule)));
    return h(
      "li",
      { class: `rule rule--${rule.kind}` },
      h(
        "span",
        { class: "rule-label", title: tag ? tagTooltip(tag) : ruleSentence(verb, rule) },
        ruleLabel(rule),
      ),
      rule.kind === "fluff" && level(rule.at),
      rule.kind === "topic" && h("span", { class: "rule-note" }, "your topic"),
      remove,
    );
  };

  /** How much is too much: a plain select, the one control everyone knows. */
  const level = (at: number) => {
    const select = h(
      "select",
      { class: "rule-level", "aria-label": "How much fluff folds a post" },
      ...FLUFF_LEVELS.map((l) => h("option", { value: String(l.at) }, l.label)),
    ) as HTMLSelectElement;
    select.value = String(at);
    select.addEventListener("change", () =>
      save(withRule(display, "fold", { kind: "fluff", at: Number(select.value) })),
    );
    return select;
  };

  const sheet = (verb: Verb) => {
    const groups = offers(display, verb)
      .filter((g) => g.items.length > 0)
      .map((g) => {
        // One line under the group that explains whichever chip is pointed at.
        const about = h(
          "p",
          { class: "offer-about" },
          h("span", { class: "muted" }, "Point at one to see what it means."),
        );
        return h(
          "div",
          { class: "offer-group" },
          h("p", { class: "offer-title" }, g.title),
          h(
            "div",
            { class: "offers" },
            ...g.items.map((o) => {
              const b = h("button", { type: "button", class: `offer offer--${o.kind}` }, o.label);
              b.addEventListener("click", () => save(withRule(display, verb, o.rule)));
              // Clichés and good signs are jargon: say what one means as soon as it's pointed at.
              const tag = ruleTag(o.rule);
              if (tag) {
                const explain = () => {
                  about.hidden = false;
                  about.replaceChildren(
                    h("strong", null, o.label),
                    ` · ${tag.hint}`,
                    h("span", { class: "muted" }, ` · e.g. ${tag.example}`),
                  );
                };
                b.addEventListener("mouseenter", explain);
                b.addEventListener("focus", explain);
              }
              return b;
            }),
          ),
          g.items.some((o) => ruleTag(o.rule)) && about,
        );
      });
    const input = h("input", {
      type: "text",
      maxlength: MAX_TOPIC_CHARS,
      placeholder: verb === "fold" ? "e.g. crypto" : "e.g. Rust",
      "aria-label": "Your own topic",
    });
    const addTopic = () => {
      const label = input.value.replace(/\s+/g, " ").trim();
      if (label) save(withRule(display, verb, { kind: "topic", label }));
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addTopic();
    });
    const full = display.topics.length >= MAX_TOPICS;
    return [
      ...groups,
      h(
        "div",
        { class: "offer-group" },
        h("p", { class: "offer-title" }, "Your own topic"),
        full
          ? h("p", { class: "hint muted" }, `Up to ${MAX_TOPICS}. Remove one to add another.`)
          : h(
              "div",
              { class: "topic-add" },
              input,
              h("button", { type: "button", class: "secondary small", onclick: addTopic }, "Add"),
            ),
      ),
    ];
  };

  const paint = () => {
    for (const verb of ["fold", "star"] as const) {
      const { rules, sheet: box, add } = lists[verb];
      const current = rulesOf(display, verb);
      rules.replaceChildren(
        ...(current.length
          ? current.map((rule) => row(verb, rule))
          : [
              h("li", { class: "rule-empty" }, verb === "fold" ? "Nothing folds." : "Nothing yet."),
            ]),
      );
      box.hidden = !open[verb];
      box.replaceChildren(...(open[verb] ? sheet(verb) : []));
      add.textContent = open[verb] ? "Done" : "+ Add";
      add.onclick = () => {
        open[verb] = !open[verb];
        paint();
      };
    }

    const active = activePreset(display);
    presetsBox.replaceChildren(
      ...PRESETS.map((preset) => {
        const button = h(
          "button",
          { type: "button", class: "preset", title: preset.blurb },
          `${preset.emoji} ${preset.label}`,
        );
        button.setAttribute("aria-pressed", String(preset === active));
        button.addEventListener("click", () => save(applyPreset(display, preset)));
        return button;
      }),
    );

    for (const [input, key] of [
      [showIndex, "showIndex"],
      [showCliches, "showCliches"],
      [showGood, "showGood"],
      [showCategory, "showCategory"],
    ] as const) {
      input.checked = display[key];
      input.onchange = () => save({ ...display, [key]: input.checked });
    }
  };
  paint();
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
