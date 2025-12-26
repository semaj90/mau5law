import type { defineConfig, devices  } from '@playwright/test';

/**
 * Dynamic Playwright Config
 * Supports both HTTP (5173) and QUIC/Caddy (5178) ports
 * Port detection happens in test files using port-detector helper
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    // Base URL is dynamically detected in tests
    // HTTP ports: 5173-5177
    // QUIC/Caddy port: 5178
    trace: 'on',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
