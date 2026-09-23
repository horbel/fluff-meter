import { describe, expect, it, vi } from "vitest";
import { isZeroBullshit, legendAnalysis, ZERO_BULLSHIT_AUTHORS } from "@/lib/analysis/easter-egg";
import { Analyzer } from "@/lib/analyzer";
import { DEFAULT_DISPLAY } from "@/lib/settings";

const [someone] = [...ZERO_BULLSHIT_AUTHORS];

describe("the zero-bullshit list", () => {
  it("matches listed profiles, case-insensitively", () => {
    expect(someone).toBeDefined();
    expect(isZeroBullshit(someone)).toBe(true);
    expect(isZeroBullshit(someone?.toUpperCase())).toBe(true);
    expect(isZeroBullshit("in:someone-else")).toBe(false);
    expect(isZeroBullshit(undefined)).toBe(false);
  });

  it("scores exactly zero with no tropes", () => {
    const a = legendAnalysis();
    expect(a.index).toBe(0);
    expect(a.tropes).toEqual([]);
    expect(a.source).toBe("legend");
  });

  it("never calls the API for listed authors", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const analyzer = new Analyzer(async () => ({
      apiKey: "ts_live_key",
      enabled: true,
      display: DEFAULT_DISPLAY,
    }));
    const a = await analyzer.analyze({ text: "Agree? 👇", author: someone as string });
    expect(a.source).toBe("legend");
    expect(fetch).not.toHaveBeenCalled();
  });
});
