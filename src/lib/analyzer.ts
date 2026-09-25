import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { demoAnalysis } from "./analysis/demo";
import { isZeroFluff, legendAnalysis } from "./analysis/easter-egg";
import { analyzeWithJev, createClient } from "./analysis/jev";
import { cleanTopics } from "./analysis/rubric";
import type { Analysis, PostInput } from "./analysis/types";
import { getCached, putCached } from "./cache";
import { hashText } from "./hash";
import { personalView } from "./personal";
import { modeOf, type Settings } from "./settings";
import { dailyStatsItem, recordAnalysis } from "./stats";

/** Jev answers in well under a second; six at a time keeps a fast scroll well under rate limits. */
const MAX_CONCURRENT = 6;

/** Runs posts through demo mode or Jev, with caching, de-duplication and a concurrency cap. */
export class Analyzer {
  #client: { key: string; instance: TypeSafeClient } | undefined;
  #inflight = new Map<string, Promise<Analysis>>();
  #running = 0;
  #queue: (() => void)[] = [];
  /** Stats writes are chained so parallel results don't overwrite each other's counts. */
  #statsWrite: Promise<void> = Promise.resolve();

  constructor(private readonly getSettings: () => Promise<Settings>) {}

  async analyze(post: PostInput, foldable = true, urgent = true): Promise<Analysis> {
    if (isZeroFluff(post.author)) return legendAnalysis();
    const settings = await this.getSettings();
    const mode = modeOf(settings);
    const topics = cleanTopics(settings.display.topics.map((t) => t.label));
    if (mode.kind === "demo") return demoAnalysis(post, topics);

    // Topics are part of the question, so a different set of topics is a different result.
    const hash = hashText(`${post.text}\n${post.reshared ?? ""}\n${topics.join("\n")}`);
    const existing = this.#inflight.get(hash);
    if (existing) return existing;

    const job = (async () => {
      const cached = await getCached(hash);
      if (cached) return cached;
      const analysis = await this.#limited(
        () => analyzeWithJev(this.#clientFor(settings.apiKey), post, topics),
        urgent,
      );
      await putCached(hash, analysis);
      // Posts about a tragedy get no badge, so they don't count towards the feed's fluff either.
      if (!analysis.sensitive) await this.#recordStats(analysis, settings, foldable);
      return analysis;
    })();
    this.#inflight.set(hash, job);
    try {
      return await job;
    } finally {
      this.#inflight.delete(hash);
    }
  }

  #recordStats(analysis: Analysis, settings: Settings, foldable: boolean): Promise<void> {
    const view = personalView(analysis, settings.display);
    this.#statsWrite = this.#statsWrite
      .then(async () =>
        dailyStatsItem.setValue(
          recordAnalysis(
            await dailyStatsItem.getValue(),
            analysis,
            new Date(),
            view.index,
            foldable && !!view.fold,
          ),
        ),
      )
      .catch(() => {}); // stats are cosmetic; never fail an analysis over them
    return this.#statsWrite;
  }

  #clientFor(apiKey: string): TypeSafeClient {
    if (this.#client?.key !== apiKey) {
      this.#client = { key: apiKey, instance: createClient(apiKey) };
    }
    return this.#client.instance;
  }

  /** Runs `task` when a slot is free. Posts on screen go to the front of the line. */
  async #limited<T>(task: () => Promise<T>, urgent = true): Promise<T> {
    if (this.#running >= MAX_CONCURRENT) {
      await new Promise<void>((resolve) =>
        urgent ? this.#queue.unshift(resolve) : this.#queue.push(resolve),
      );
    }
    this.#running++;
    try {
      return await task();
    } finally {
      this.#running--;
      this.#queue.shift()?.();
    }
  }
}
