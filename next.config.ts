import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// When running local dev, initOpenNextCloudflareForDev tries to bridge bindings.
// If WRANGLER_SEND_METRICS or remote preview attempts to activate, setting remote: false
// or handling error prevents workerd from requesting workers.dev subdomain registration.
export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    try {
      initOpenNextCloudflareForDev();
    } catch (e) {
      console.warn("Miniflare init warning:", e);
    }
  }

  return {
    output: 'standalone',
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
