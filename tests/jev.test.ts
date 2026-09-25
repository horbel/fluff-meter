import { describe, expect, it, vi } from "vitest";
import { analyzeWithJev, createClient, MAX_POST_CHARS, pingJev } from "@/lib/analysis/jev";
import { detectProvider } from "@/lib/analysis/providers";
import { QUESTIONS } from "@/lib/analysis/rubric";
import { AnalysisError } from "@/lib/analysis/types";

/** A response in the shape documented at https://docs.typesafe.ai/api#response-body. */
function jevResponse(overrides: Record<string, unknown> = {}) {
  const score = (value: number) => ({
    type: "score",
    score: value,
    confidence: 0.9,
    legend: { "0": "a", "1": "b", "2": "c", "3": "d" },
    probabilities: { "0": 0, "1": 0, "2": 1, "3": 0 },
  });
  const noul = (value: number) => ({ type: "noul", noul: value });
  return {
    model: "jev-1.13.0",
    answers: {
      category: {
        type: "choice",
        choice: "stories",
        confidence: 0.8,
        probabilities: { stories: 0.9, other: 0.1 },
      },
      buzzwords: score(3),
      substance: score(0),
      self_promotion: score(1.5),
      engagement_bait: noul(0.97),
      humblebrag: noul(0.9),
      parable: noul(0.85),
      truism: noul(0.8),
      hustle: noul(0.7),
      ai_overall: score(2),
      ai_words: noul(0.9),
      not_x_but_y: noul(0.1),
      triads: noul(0.7),
      fragments: noul(0.95),
      fake_candor: noul(0.05),
      human_details: noul(0.1),
      sensitive: noul(0.02),
      ...overrides,
    },
    usage: { input_tokens: 1200, output_tokens: 90 },
  };
}

function mockFetch(status: number, body: unknown) {
  return vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
}

const noRetry = { maxRetries: 0 };

describe("detectProvider", () => {
  it("routes OpenRouter keys to OpenRouter and everything else to TypeSafe", () => {
    expect(detectProvider("sk-or-v1-abc")).toBe("openrouter");
    expect(detectProvider("  sk-or-v1-abc ")).toBe("openrouter");
    expect(detectProvider("ts_live_abc")).toBe("typesafe");
  });
});

describe("analyzeWithJev", () => {
  it("sends one System One request with every question", async () => {
    const fetch = mockFetch(200, jevResponse());
    await analyzeWithJev(createClient("ts_key", "typesafe", { fetch, retry: noRetry }), {
      text: "Agree?",
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer ts_key");

    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe("jev-latest");
    expect(body.state).toBe("Agree?");
    expect(Object.keys(body.questions).sort()).toEqual(Object.keys(QUESTIONS).sort());
    for (const q of Object.values(body.questions) as { type: string }[]) {
      expect(["noul", "choice", "score"]).toContain(q.type);
    }
  });

  it("uses OpenRouter's base URL for OpenRouter keys", async () => {
    const fetch = mockFetch(200, jevResponse());
    await analyzeWithJev(createClient("sk-or-v1-x", undefined, { fetch, retry: noRetry }), {
      text: "hi",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe("https://openrouter.ai/api/v1/systemone");
  });

  it("sends reposts as structured state and caps long posts", async () => {
    const fetch = mockFetch(200, jevResponse());
    await analyzeWithJev(createClient("k", "typesafe", { fetch, retry: noRetry }), {
      text: "x".repeat(MAX_POST_CHARS + 500),
      reshared: "original",
    });
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.state.post).toHaveLength(MAX_POST_CHARS);
    expect(body.state.reshared_post).toBe("original");
  });

  it("maps answers onto signals and a high index for a cliché post", async () => {
    const client = createClient("k", "typesafe", {
      fetch: mockFetch(200, jevResponse()),
      retry: noRetry,
    });
    const a = await analyzeWithJev(client, { text: "Agree?" });

    expect(a.source).toBe("jev");
    expect(a.model).toBe("jev-1.13.0");
    expect(a.category).toBe("stories");
    expect(a.signals.buzzwords).toBe(1); // top of a 4-level score
    expect(a.signals.fluff).toBe(1); // zero substance
    expect(a.signals.self_promotion).toBeCloseTo(0.5);
    expect(a.tropes.slice(0, 2)).toEqual(["engagement_bait", "humblebrag"]);
    expect(a.sensitive).toBe(false);
    expect(a.topics).toEqual({});
    expect(a.index).toBeGreaterThan(70);
    expect(a.ai.likelihood).toBeGreaterThan(0.65);
    expect(a.ai.tells.slice(0, 2)).toEqual(["fragments", "ai_words"]);
  });

  it("asks about the reader's topics in the same request", async () => {
    const fetch = mockFetch(
      200,
      jevResponse({ topic_0: { type: "noul", noul: 0.92 }, topic_1: { type: "noul", noul: 0.03 } }),
    );
    const a = await analyzeWithJev(
      createClient("k", "typesafe", { fetch, retry: noRetry }),
      { text: "x" },
      ["Rust", "crypto"],
    );
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.questions.topic_0.type).toBe("noul");
    expect(JSON.stringify(body.questions.topic_0)).toContain("Rust");
    expect(a.topics).toEqual({ Rust: 0.92, crypto: 0.03 });
  });

  it("marks posts about a tragedy so the badge can stay quiet", async () => {
    const fetch = mockFetch(200, jevResponse({ sensitive: { type: "noul", noul: 0.95 } }));
    const a = await analyzeWithJev(createClient("k", "typesafe", { fetch, retry: noRetry }), {
      text: "x",
    });
    expect(a.sensitive).toBe(true);
  });

  it("rejects responses it can't trust instead of showing a wrong number", async () => {
    const bad = [
      jevResponse({ category: { type: "choice", choice: "astrology", confidence: 1 } }),
      jevResponse({ buzzwords: undefined }),
      jevResponse({ humblebrag: { type: "noul", noul: "yes" } }),
    ];
    for (const body of bad) {
      const client = createClient("k", "typesafe", { fetch: mockFetch(200, body), retry: noRetry });
      await expect(analyzeWithJev(client, { text: "x" })).rejects.toMatchObject({
        code: "bad_response",
      });
    }
  });

  it.each([
    [401, "invalid_key"],
    [403, "invalid_key"],
    [402, "no_credits"],
    [429, "rate_limited"],
    [529, "rate_limited"],
    [500, "api_error"],
  ])("turns HTTP %i into a %s error", async (status, code) => {
    const client = createClient("k", "typesafe", {
      fetch: mockFetch(status, { error: "nope" }),
      retry: noRetry,
    });
    const err = await analyzeWithJev(client, { text: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AnalysisError);
    expect((err as AnalysisError).code).toBe(code);
  });

  it("reports network failures as such", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const client = createClient("k", "typesafe", { fetch, retry: noRetry });
    await expect(analyzeWithJev(client, { text: "x" })).rejects.toMatchObject({ code: "network" });
  });
});

describe("pingJev", () => {
  it("returns the versioned model that answered", async () => {
    const fetch = mockFetch(200, {
      model: "jev-1.13.0",
      answers: { greeting: { type: "noul", noul: 0.99 } },
      usage: { input_tokens: 20, output_tokens: 1 },
    });
    await expect(pingJev(createClient("k", "typesafe", { fetch }))).resolves.toEqual({
      model: "jev-1.13.0",
    });
  });
});
