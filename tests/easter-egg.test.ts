import { describe, expect, it } from "vitest";
import { isLegend, LEGENDS } from "@/lib/analysis/easter-egg";
import { Analyzer } from "@/lib/analyzer";
import { DEFAULT_DISPLAY } from "@/lib/settings";

const [someone] = [...LEGENDS];

describe("the legends list", () => {
  it("matches listed profiles, case-insensitively", () => {
    expect(someone).toBeDefined();
    expect(isLegend(someone)).toBe(true);
    expect(isLegend(someone?.toUpperCase())).toBe(true);
    expect(isLegend("in:someone-else")).toBe(false);
    expect(isLegend(undefined)).toBe(false);
  });

  it("scores a legend's post like anyone else's, with the chip on top", async () => {
    const analyzer = new Analyzer(async () => ({
      apiKey: "",
      enabled: true,
      display: DEFAULT_DISPLAY,
    }));
    const text = "Agree? 👇 Comment YES and I'll send you the playbook.";
    const plain = await analyzer.analyze({ text, author: "in:someone-else" });
    const legend = await analyzer.analyze({ text, author: someone as string });
    expect(plain.legend).toBeUndefined();
    expect(legend).toEqual({ ...plain, legend: true });
  });
});
