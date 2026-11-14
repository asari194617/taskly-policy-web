import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx,mjs}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["lib/**/*.ts", "worker/**/*.mjs", "components/**/*.tsx"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
    },
  },
});
