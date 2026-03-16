// ESLint configuration for Bun/TypeScript project
// Uses TypeScript parser and plugin for proper TS syntax support

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // No 'project' option - using non-type-checked rules for speed
      },
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Bun: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // TypeScript recommended rules (non-type-checked)
      ...tsPlugin.configs.recommended.rules,

      // Override TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",

      // Keep existing rules from current config
      "no-console": "off",
      "no-constant-condition": "off",
      "no-control-regex": "off",  // ANSI escape codes are intentional for terminal output
      "no-empty": "warn",
      "no-debugger": "warn",
      "no-duplicate-imports": "warn",
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    ignores: [
      "dist/**",
      "bin/**",
      "node_modules/**",
      "*.js",
      "v_model/**",
      "*.md",
      "src/__tests__/**",
    ],
  },
];
