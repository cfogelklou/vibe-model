// Simple ESLint configuration for Bun/TypeScript project
// This provides basic linting without TypeScript-specific rules

export default [
  {
    files: ["src/**/*.ts", "scripts/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Bun: "readonly",
      },
    },
    rules: {
      // Basic rules
      "no-console": "off",
      "no-constant-condition": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
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
