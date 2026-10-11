import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts"
  ]),
  // UI prototype separation (ADR-0012, specs/04-web/prototype.md).
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["proto/**", "app/proto/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/proto", "@/proto/**", "**/proto/**", "@/app/proto/**"],
              message:
                "Production code never imports the UI prototype (ADR-0012)."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["proto/**", "app/proto/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/**",
                "@/lib/api/client",
                "@/lib/auth/**",
                "@/app/(dashboard-layout)/**"
              ],
              message:
                "The prototype uses its own twins under proto/ and mock hooks, never real data or auth code (specs/04-web/prototype.md)."
            }
          ]
        }
      ]
    }
  },
  // Last, so Prettier owns formatting (code-style, T-0006).
  eslintConfigPrettier
]);

export default eslintConfig;
