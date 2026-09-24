import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

/** Live API checks only. `npm test` never runs these. */
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ["tests/**/*.smoke.ts"],
    environment: "node",
    env: loadEnv("", process.cwd(), ""),
  },
});
