// Flat ESLint config (ESM) for ESM Netlify Functions
// https://eslint.org/docs/latest/use/configure/configuration-files-new

import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["netlify/functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Runtime globals in Netlify edge/deno-like env
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        crypto: "readonly",
        console: "readonly",
        // Node.js globals used by Netlify Functions
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        global: "readonly",
        globalThis: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "prefer-const": "warn",
      curly: ["warn", "all"],
      eqeqeq: ["warn", "smart"],
      // Reduce churn: warnings for unused and allow underscore conventions
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow empty catch blocks used for optional blob reads
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    ignores: ["node_modules/", "dist/", ".netlify/", ".git/"],
  },
];
