import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    include: ["scraper/**/*.test.ts", "convex/**/*.test.ts", "lib/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
});
