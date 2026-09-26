import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Fluff Meter for LinkedIn",
    short_name: "Fluff Meter",
    description:
      "Rates LinkedIn posts on a 0-100% Fluff Index, names the clichés and folds what you don't want to read.",
    // `storage` keeps settings and the result cache on this device only.
    permissions: ["storage"],
    // The API hosts are called from the background worker only; LinkedIn is where the badges go.
    host_permissions: ["https://api.typesafe.ai/*", "https://openrouter.ai/*"],
    action: {
      default_title: "Fluff Meter",
    },
  },
  webExt: {
    startUrls: ["https://www.linkedin.com/feed/"],
  },
});
