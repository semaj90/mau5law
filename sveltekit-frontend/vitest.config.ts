import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    // broaden includes to capture __tests__ folders and nested test files
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/lib/**/*.test.{js,ts}',
      'src/lib/**/__tests__/**/*.{test,spec}.{js,ts}',
      // Keep Playwright E2E tests out of Vitest (Playwright uses its own runner)
      // 'tests/**/*.{test,spec}.{js,ts}',
    ],
    // Exclude Playwright E2E tests and integration suites that require external services
    exclude: [
      'tests/**',
      'tests/**/*.spec.{js,ts}',
      'src/lib/services/**/__tests__/integration/**',
      'src/lib/services/**/__tests__/shared/**',
    ],
    // Use jsdom for unit tests so SvelteKit components and $lib aliases resolve correctly
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'], // Updated setup file path
    testTimeout: 30000, // Increased timeout for integration tests
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts',
        'src/app.html',
        'src/lib/server/**', // Exclude server-side code from browser tests
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Stricter requirements for XState machines
        'src/lib/machines/**': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        // High coverage for service coordination
        'src/lib/services/xstate-integration.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    // Performance testing configuration
    benchmark: {
      include: ['**/*.{bench,benchmark}.?(c|m)[jt]s?(x)'],
      exclude: ['node_modules/**', 'dist/**'],
      reporters: ['verbose'],
    },
  },
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $app: fileURLToPath(new URL('./src/app', import.meta.url)),
      '@xstate/test': '@xstate/test',
      'xstate/lib/testing': 'xstate/es/testing',
    },
  },
});
