import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    // Not project source: vendored skills, partner fixtures, night-run tooling.
    ".claude/**",
    ".tools/**",
    "skills/**",
    "docs/partners/raw/**",
    "night-run/**",
    "design/**",
  ]),
]);

export default eslintConfig;
