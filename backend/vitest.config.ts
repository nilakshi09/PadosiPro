/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests from the src/tests directory
    include: ["src/tests/**/*.test.ts"],
    // Increase timeout for tests that hit the database
    testTimeout: 10000,
  },
});
