import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'url';

// Single merged Vitest config for sveltekit-frontend (unit + integration specialized configs kept separately)
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // include unit tests in our new test folder and standard patterns
    include: [
      'src/lib/tests/unit/**/*.test.{js,ts}',
      'src/**/*.{test,spec}.{js,ts}',
      'src/lib/**/*.test.{js,ts}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/**',
      'src/lib/services/**/__tests__/integration/**',
    ],
    environment: 'node', // GPU pipeline must run in Node, NOT jsdom
    globals: true,
    // Omit heavy global setup for lightweight unit tests to avoid importing large integration helpers
    setupFiles: [],
    testTimeout: 30000,
    hookTimeout: 10000,
    reporters: ['default'],
    coverage: { enabled: false }
  },
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $app: fileURLToPath(new URL('./src/app', import.meta.url)),
      $routes: fileURLToPath(new URL('./src/routes', import.meta.url)),
    },
  },
});
