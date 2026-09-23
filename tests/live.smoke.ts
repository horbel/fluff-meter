/**
 * Live check against the real API. Not part of `npm test`: it needs a key and costs a
 * fraction of a cent. Run with `npm run smoke` after putting a key in `.env`.
 */
import { describe, expect, it } from "vitest";
import { analyzeWithJev, createClient } from "@/lib/analysis/jev";
import { verdictFor } from "@/lib/analysis/labels";
import type { Analysis } from "@/lib/analysis/types";
import { SAMPLE_POSTS } from "./fixtures/sample-posts";

const keys = {
  typesafe: process.env.TYPESAFE_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

for (const [provider, key] of Object.entries(keys)) {
  describe.skipIf(!key)(`Jev via ${provider}`, () => {
    it("scores every sample post and ranks clichés above substance", async () => {
      const tokens: number[] = [];
      const client = createClient(key as string, undefined, {
        fetch: async (url, init) => {
          const response = await fetch(url, init);
          const body = await response.clone().json();
          tokens.push(body?.usage?.input_tokens ?? 0);
          return response;
        },
      });
      const results: Record<string, Analysis> = {};
      await Promise.all(
        Object.entries(SAMPLE_POSTS).map(async ([name, text]) => {
          results[name] = await analyzeWithJev(client, { text });
        }),
      );

      console.table(
        Object.fromEntries(
          Object.entries(results).map(([name, a]) => [
            name,
            {
              index: a.index,
              verdict: verdictFor(a.index).label,
              category: `${a.category} (${Math.round(a.categoryConfidence * 100)}%)`,
              tropes: a.tropes.join(", "),
              ai: `${Math.round(a.ai.likelihood * 100)}% ${a.ai.tells.join(", ")}`,
              model: a.model,
            },
          ]),
        ),
      );
      console.table(
        Object.fromEntries(
          Object.entries(results).map(([name, a]) => [
            name,
            Object.fromEntries(Object.entries(a.signals).map(([k, v]) => [k, v.toFixed(2)])),
          ]),
        ),
      );

      const avg = Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length);
      console.log(`Average input tokens per post: ${avg}`);

      const r = results as Record<keyof typeof SAMPLE_POSTS, Analysis>;
      expect(r.cliche.index).toBeGreaterThanOrEqual(80);
      expect(r.technical.index).toBeLessThan(20);
      expect(r.cliche.index).toBeGreaterThan(r.technical.index + 50);
      expect(r.corporate.index).toBeGreaterThan(r.hiring.index);
      expect(r.technical.category).toBe("technical");
      expect(r.hiring.category).toBe("hiring");
      expect(r.cliche.tropes).toContain("engagement_bait");
      expect(r.aiWritten.ai.likelihood).toBeGreaterThanOrEqual(0.65);
      expect(r.human.ai.likelihood).toBeLessThan(0.35);
      expect(r.technical.ai.likelihood).toBeLessThan(0.5);
    }, 60_000);

    it("tells routine updates from notable news", async () => {
      const client = createClient(key as string);
      const [routine, notable] = await Promise.all([
        analyzeWithJev(client, { text: SAMPLE_POSTS.routineJob }),
        analyzeWithJev(client, { text: SAMPLE_POSTS.notableJob }),
      ]);
      console.log(
        `Routine: new job ${routine.signals.routine.toFixed(2)} → ${routine.index}%, notable ${notable.signals.routine.toFixed(2)} → ${notable.index}%`,
      );
      expect(routine.tropes).toContain("routine");
      expect(notable.tropes).not.toContain("routine");
      expect(routine.index).toBeGreaterThan(notable.index);
    }, 60_000);
  });
}
