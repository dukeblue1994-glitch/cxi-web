// ESLint config for ESM Netlify Functions + simple JS
module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  extends: ["eslint:recommended"],
  overrides: [
    {
      files: [".eslintrc.{js,cjs}"],
      env: { node: true },
      parserOptions: { sourceType: "script" },
    },
    {
      files: ["netlify/functions/**/*.js"],
      env: { node: true },
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
  ],
  rules: {
    "no-console": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "prefer-const": "warn",
    "no-var": "error",
    curly: ["warn", "all"],
    eqeqeq: ["warn", "smart"],
  },
  ignorePatterns: ["node_modules/", ".netlify/", "dist/", ".git/"],
};
