import { createClient, pingJev, toAnalysisError } from "@/lib/analysis/jev";
import { Analyzer } from "@/lib/analyzer";
import { pruneCache } from "@/lib/cache";
import type { Request, Response } from "@/lib/messages";
import { publicSettingsItem, settingsItem, toPublic } from "@/lib/settings";

export default defineBackground(() => {
  const analyzer = new Analyzer(() => settingsItem.getValue());

  async function handle(request: Request): Promise<unknown> {
    switch (request.type) {
      case "analyze":
        return analyzer.analyze(request.post, request.foldable ?? true, request.urgent ?? true);
      case "test-key":
        return pingJev(createClient(request.apiKey));
    }
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Only our own popup and content scripts may use the key.
    if (sender.id !== browser.runtime.id) return false;
    handle(message as Request).then(
      (data) => sendResponse({ ok: true, data } satisfies Response<unknown>),
      (err: unknown) => {
        const { code, message: text } = toAnalysisError(err);
        sendResponse({ ok: false, error: { code, message: text } } satisfies Response<unknown>);
      },
    );
    return true; // keeps the channel open for the async response
  });

  browser.runtime.onInstalled.addListener(async () => {
    // Re-derive the key-free mirror in case its shape changed in an update.
    await publicSettingsItem.setValue(toPublic(await settingsItem.getValue()));
    await pruneCache();
    // Totals from 0.1.0, replaced by per-day stats.
    await browser.storage.local.remove(["stats", "stats$"]);
  });
});
