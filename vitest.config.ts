import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Resolves the "server-only" marker package to its no-op export during tests, matching
    // how Next.js's own server bundler resolves it for Server Components/route handlers —
    // without this, importing anything that uses "server-only" throws outside of Next's build.
    conditions: ["react-server"],
  },
  ssr: {
    resolve: {
      conditions: ["react-server"],
    },
  },
});
