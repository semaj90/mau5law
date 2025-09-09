import { defineConfig, devices } from '@playwright/test';

// Fix conflict with Vitest matchers
delete (globalThis as any).__vitest_index__;
delete (globalThis as any).__vitest_worker__;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 180000, // 3 minutes for GPU inference tests
  expect: {
    timeout: 30000
  },
  // Global setup and teardown
  globalSetup: './test/global-setup.mjs',
  globalTeardown: './test/global-teardown.mjs',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/test-setup.spec.ts'
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup']
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      // Use test database for integration tests
      DATABASE_URL: 'postgresql://legal_admin:testpass123@localhost:5434/legal_ai_test',
      REDIS_URL: 'redis://localhost:6380'
    }
  }
});