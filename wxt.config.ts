import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Bullshit Detector",
    short_name: "BS Detector",
    description:
      "Rates every LinkedIn post on the Bullshit Index (0–100%), spots AI-written posts and names the tropes. Powered by Jev.",
    // `storage` keeps settings and the result cache on this device only.
    permissions: ["storage"],
    // The API hosts are called from the background worker only; LinkedIn is where the badges go.
    host_permissions: ["https://api.typesafe.ai/*", "https://openrouter.ai/*"],
    action: {
      default_title: "Bullshit Detector",
    },
  },
  webExt: {
    startUrls: ["https://www.linkedin.com/feed/"],
  },
});
