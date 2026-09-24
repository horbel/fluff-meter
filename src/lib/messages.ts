import { browser } from "#imports";
import type { Analysis, AnalysisErrorCode, PostInput } from "./analysis/types";

/** Every message the background worker answers. Content scripts and the popup are the senders. */
export type Request = { type: "analyze"; post: PostInput } | { type: "test-key"; apiKey: string };

interface ResponseData {
  analyze: Analysis;
  "test-key": { model: string };
}

export interface SerializedError {
  code: AnalysisErrorCode;
  message: string;
}

export type Response<T> = { ok: true; data: T } | { ok: false; error: SerializedError };

export class RemoteError extends Error {
  constructor(readonly error: SerializedError) {
    super(error.message);
    this.name = "RemoteError";
  }
}

export async function send<R extends Request>(request: R): Promise<ResponseData[R["type"]]> {
  const response = (await browser.runtime.sendMessage(request)) as
    | Response<ResponseData[R["type"]]>
    | undefined;
  if (!response)
    throw new RemoteError({ code: "api_error", message: "No response from the extension." });
  if (!response.ok) throw new RemoteError(response.error);
  return response.data;
}
