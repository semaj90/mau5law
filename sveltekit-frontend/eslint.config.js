// ESM-compatible flat config for ESLint 9+
// Works with Svelte 5 (runes), TypeScript 5+, and Prettier integration

import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{svelte,ts,js}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      // --- General ---
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-undef': 'off',

      // --- TypeScript tweaks ---
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',

      // --- Svelte specifics ---
      'svelte/no-at-html-tags': 'off', // allow controlled HTML injection
    },
    ignores: [
      'node_modules',
      '.svelte-kit',
      'build',
      'dist',
      'coverage',
      '**/*.config.*',
      'src/proto/*.js',
      'src/proto/**/*.js',
      "src/service-worker.ts",
      "src/tests/**",
      "**/*.d.ts"
    ],
  }
);
