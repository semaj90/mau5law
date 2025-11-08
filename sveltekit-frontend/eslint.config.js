// eslint.config.js — ESLint 9+ flat-config for SvelteKit 2 + TypeScript + Prettier
import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier, // must be last
  {
    files: ["**/*.ts", "**/*.js", "**/*.svelte"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "off",
      "svelte/no-at-html-tags": "off",
    },
  },
];
