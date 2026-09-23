/**
 * Jev is reachable directly from TypeSafe and through OpenRouter. Both expose the same
 * System One endpoint (`POST /v1/systemone`), so one official SDK client covers both:
 * only the base URL and the key change.
 */
export const PROVIDERS = {
  typesafe: {
    label: "TypeSafe",
    baseURL: "https://api.typesafe.ai",
    keysUrl: "https://console.typesafe.ai/keys",
  },
  openrouter: {
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api",
    keysUrl: "https://openrouter.ai/settings/keys",
  },
} as const;
export type ProviderId = keyof typeof PROVIDERS;

export function detectProvider(apiKey: string): ProviderId {
  return apiKey.trim().startsWith("sk-or-") ? "openrouter" : "typesafe";
}
