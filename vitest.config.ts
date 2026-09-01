import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Slow spinning HDD (D:) cold-loads the full ESM module graph (algosdk + viem +
    // fastify + prisma + bullmq) on the first-scheduled test file; vitest's 5s default
    // per-test/hook timeout is too tight for that one-time load. 30s covers the cold
    // case — warm runs and CI on faster disks are unaffected.
    testTimeout: 30000,
    hookTimeout: 30000,
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
