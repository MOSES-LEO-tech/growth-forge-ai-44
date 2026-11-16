import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "growth-forge-ai-44-main/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    // Render paths must not default a numeric value to 0. 0 is a real
    // measurement; absence is not zero. Use NumericValue + formatNumber from
    // src/lib/numeric.ts. Error-level: the 36 original sites are migrated or
    // annotated with a documented reason (W9 complete).
    files: ["src/pages/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "LogicalExpression[operator='||'][right.value=0]",
          message:
            "Do not default a number to 0 (|| 0). Use NumericValue + formatNumber (src/lib/numeric.ts) so loading/error/empty never render as 0.",
        },
        {
          selector: "LogicalExpression[operator='??'][right.value=0]",
          message:
            "Do not coalesce a number to 0 (?? 0). Use NumericValue + formatNumber (src/lib/numeric.ts).",
        },
      ],
    },
  },
);
