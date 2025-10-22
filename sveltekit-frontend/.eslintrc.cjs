/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.svelte'],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Keep global rules minimal; apply the strict no-explicit-any only to our server lib where we made changes.
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^\\$',
        argsIgnorePattern: '^_',
      },
    ],
    // Disable for Svelte 5 runes
    'no-undef': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value='http://localhost:11434']",
        message: 'Use getOllamaEndpoint() instead of hardcoded Ollama URLs.',
      },
    ],
  },
  ignorePatterns: [
    '*.md',
    'dist',
    'build',
    '.svelte-kit',
    'node_modules',
    'js_tests/**/*',
    'playwright-report/**/*',
    'drizzle.config.ts',
    'src/hooks.client.ts',
    'src/service-worker.ts',
    'src/test-setup.ts',
    'tests/**/*',
    'scripts/**/*',
    '*.config.ts',
    'vite.config.ts',
    'vitest.config.ts',
    'uno.config.ts',
    'unocss.config.ts',
    // Ignore Svelte files to avoid plugin circular reference issues
    '*.svelte',
  ],
  overrides: [
    {
      files: ['src/lib/**', 'src/routes/api/**', 'src/routes/**/+server.ts', 'src/routes/**/+page.server.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
