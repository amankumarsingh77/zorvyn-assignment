import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/config/**"],
    },
  },
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "src") + "/",
      "@generated/": path.resolve(__dirname, "generated") + "/",
    },
  },
});
