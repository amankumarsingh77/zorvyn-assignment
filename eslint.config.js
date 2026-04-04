import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    ignores: ["dist/", "generated/", "node_modules/", "*.js", "vitest.config.ts", "prisma.config.ts"],
  },
  {
    // Test files use res.json() which returns `any` in Hono's test client.
    // Disabling no-unsafe-* rules here avoids hundreds of false positives
    // that would require verbose type assertions on every response parse.
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
    },
  }
);
