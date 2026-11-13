import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  // Default is 30s. The shared public demo periodically slows down hard (observed login
  // round-trips of 7-14s during degraded periods, vs normal <1s) -- a per-test
  // testInfo.setTimeout() bump inside the test body does NOT cover the login/page fixture
  // phase that runs before the test body executes, so that phase was the one still hitting
  // the old 30s default during slow periods. 60s gives headroom for that without masking a
  // genuinely hung test.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
    ['./src/reporters/bugListReporter.ts'],
  ],
  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
