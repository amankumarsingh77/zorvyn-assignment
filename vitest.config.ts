import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "src") + "/",
      "@generated/": path.resolve(__dirname, "generated") + "/",
    },
  },
});
