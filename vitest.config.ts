import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx,mjs}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["lib/**/*.ts", "worker/**/*.mjs", "components/**/*.tsx"],
      // Official MIT snippets are vendored dependencies; our integration is exercised by E2E.
      // The browser-only catalog hook is covered by Playwright in both viewports.
      exclude: ["components/dads/**", "lib/use-catalog.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
});
