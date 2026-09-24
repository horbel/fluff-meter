import {
  APIConnectionError,
  APIError,
  noul,
  TypeSafeClient,
  type TypeSafeClientConfig,
} from "@typesafe-ai/sdk";
import { REPO_URL } from "../constants";
import { aiVerdict } from "./ai";
import { formattingSignal, textStats } from "./heuristics";
import { detectProvider, PROVIDERS, type ProviderId } from "./providers";
import { QUESTIONS } from "./rubric";
import { buildAnalysis, normaliseScore } from "./scoring";
import {
  type Analysis,
  AnalysisError,
  CATEGORY_IDS,
  type CategoryId,
  type PostInput,
} from "./types";

/** `jev-latest` always points at the newest stable Jev, so the extension keeps working across releases. */
export const MODEL = "jev-latest";

/** Long posts are cut here; the verdict doesn't change after the first few thousand characters. */
export const MAX_POST_CHARS = 6000;

export function createClient(
  apiKey: string,
  provider: ProviderId = detectProvider(apiKey),
  overrides: Pick<TypeSafeClientConfig, "fetch" | "retry"> = {},
) {
  return new TypeSafeClient({
    apiKey: apiKey.trim(),
    baseURL: PROVIDERS[provider].baseURL,
    defaultModel: MODEL,
    timeout: 20_000,
    logLevel: "warn",
    // Requests are sent from the extension's background worker with the user's own key,
    // which never leaves this device except to the provider they chose.
    dangerouslyAllowBrowser: true,
    // Attribution headers OpenRouter shows on its dashboards; ignored by TypeSafe.
    defaultHeaders:
      provider === "openrouter" ? { "HTTP-Referer": REPO_URL, "X-Title": "Fluff Meter" } : {},
    ...overrides,
  });
}

function buildState(post: PostInput) {
  const text = post.text.slice(0, MAX_POST_CHARS);
  if (!post.reshared) return text;
  return { post: text, reshared_post: post.reshared.slice(0, MAX_POST_CHARS) };
}

const finite = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AnalysisError("bad_response", `Jev returned no usable value for "${field}".`);
  }
  return value;
};

const isCategory = (value: unknown): value is CategoryId =>
  typeof value === "string" && (CATEGORY_IDS as readonly string[]).includes(value);

export async function analyzeWithJev(
  client: TypeSafeClient,
  post: PostInput,
  signal?: AbortSignal,
): Promise<Analysis> {
  let result: Awaited<ReturnType<typeof client.systemOne<typeof QUESTIONS>>>;
  try {
    result = await client.systemOne(
      { model: MODEL, state: buildState(post), questions: QUESTIONS },
      signal ? { signal } : {},
    );
  } catch (err) {
    throw toAnalysisError(err);
  }

  const a = result.answers;
  // Answers are validated rather than trusted: a changed or partial response should show
  // an error badge, not a wrong number.
  if (!a?.category || !isCategory(a.category.choice)) {
    throw new AnalysisError("bad_response", "Jev returned no usable category.");
  }
  const levels = (q: { criteria: readonly unknown[] }) => q.criteria.length;
  const text = post.reshared ? `${post.text}\n${post.reshared}` : post.text;
  const stats = textStats(text);
  const ai = aiVerdict(
    {
      overall: normaliseScore(
        finite(a.ai_overall?.score, "ai_overall"),
        levels(QUESTIONS.ai_overall),
      ),
      ai_words: finite(a.ai_words?.noul, "ai_words"),
      not_x_but_y: finite(a.not_x_but_y?.noul, "not_x_but_y"),
      triads: finite(a.triads?.noul, "triads"),
      fragments: finite(a.fragments?.noul, "fragments"),
      fake_candor: finite(a.fake_candor?.noul, "fake_candor"),
      human_details: finite(a.human_details?.noul, "human_details"),
    },
    text,
  );

  return buildAnalysis({
    signals: {
      buzzwords: normaliseScore(
        finite(a.buzzwords?.score, "buzzwords"),
        levels(QUESTIONS.buzzwords),
      ),
      fluff:
        1 - normaliseScore(finite(a.substance?.score, "substance"), levels(QUESTIONS.substance)),
      self_promotion: normaliseScore(
        finite(a.self_promotion?.score, "self_promotion"),
        levels(QUESTIONS.self_promotion),
      ),
      engagement_bait: finite(a.engagement_bait?.noul, "engagement_bait"),
      humblebrag: finite(a.humblebrag?.noul, "humblebrag"),
      parable: finite(a.parable?.noul, "parable"),
      truism: finite(a.truism?.noul, "truism"),
      hustle: finite(a.hustle?.noul, "hustle"),
      routine: finite(a.routine?.noul, "routine"),
      sales_pitch: finite(a.sales_pitch?.noul, "sales_pitch"),
      formatting: formattingSignal(stats),
    },
    ai,
    stats,
    category: a.category.choice,
    categoryConfidence: finite(a.category.confidence, "category.confidence"),
    source: "jev",
    model: result.model,
    tokens: result.usage?.input_tokens ?? 0,
  });
}

/** The cheapest possible request, used by the popup's "Test key" button. */
export async function pingJev(client: TypeSafeClient): Promise<{ model: string }> {
  try {
    const result = await client.systemOne(
      {
        model: MODEL,
        state: "Hello!",
        questions: { greeting: noul("Is this text a greeting?") },
      },
      { retry: { maxRetries: 0 } },
    );
    return { model: result.model };
  } catch (err) {
    throw toAnalysisError(err);
  }
}

export function toAnalysisError(err: unknown): AnalysisError {
  if (err instanceof AnalysisError) return err;
  if (err instanceof APIError) {
    switch (err.status) {
      case 401:
      case 403:
        return new AnalysisError("invalid_key", `The API key was rejected (${err.status}).`);
      case 402:
        return new AnalysisError("no_credits", "The account is out of credits (402).");
      case 429:
      case 529:
        return new AnalysisError(
          "rate_limited",
          `Rate limited, try again shortly (${err.status}).`,
        );
      default:
        return new AnalysisError("api_error", `The API returned ${err.status}.`);
    }
  }
  // Covers APITimeoutError too, which extends APIConnectionError.
  if (err instanceof APIConnectionError) {
    return new AnalysisError("network", "Couldn't reach the API. Check your connection.");
  }
  return new AnalysisError("api_error", err instanceof Error ? err.message : String(err));
}
