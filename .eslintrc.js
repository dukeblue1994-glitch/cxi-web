// Slim ESLint config tailored to plain ESM JS (no React/TS) to avoid false positives
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    curly: ['warn', 'all'],
    eqeqeq: ['warn', 'smart'],
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/', '.netlify/', 'coverage/'],
};
