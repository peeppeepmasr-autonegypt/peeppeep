import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Fresh D1 project: no R2 incremental cache yet (keeps deploy simple).
// Caching/static behavior uses the adapter defaults.
export default defineCloudflareConfig({});
