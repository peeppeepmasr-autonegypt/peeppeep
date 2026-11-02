import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Only the dev server needs Miniflare to expose Cloudflare bindings (D1) locally.
// We scope the call to PHASE_DEVELOPMENT_SERVER so `next build` (and the OpenNext
// production build) never tries to spawn workerd; in prod the bindings come from
// the real Workers runtime via getCloudflareContext().
export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Reads wrangler.jsonc + .dev.vars and proxies D1 through Miniflare.
    initOpenNextCloudflareForDev();
  }

  return {
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  };
}
