import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/worker.ts"]
    },
    include: ["tests/**/*.test.ts"],
    restoreMocks: true
  }
});
