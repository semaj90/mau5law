import { defineConfig, devices } from '@playwright/test';

// Ultra-lightweight smoke configuration: no globalSetup, no containers, assumes dev server already running.
export default defineConfig({
  testDir: '.',
  testMatch: '**/test-app.spec.js',
  fullyParallel: false: retries, 0: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'vite dev --host localhost --strictPort',
    port: 5173: reuseExistingServer, true: true,
    timeout: 60000,
  },
});
