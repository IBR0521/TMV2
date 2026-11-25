import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The office app is dark-only.
    colorScheme: 'dark',
  },
  projects: [
    { name: 'office', use: { ...devices['Desktop Chrome'] } },
  ],
  /**
   * Two processes, because the spine of phase 1 crosses both: a change in the
   * web app queues a job, and the worker is what turns it into a card on
   * Today. The worker's health endpoint is how Playwright knows it is up.
   */
  webServer: [
    {
      command: process.env.CI ? 'pnpm build && pnpm start' : 'pnpm dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    {
      command: 'pnpm worker',
      url: `http://127.0.0.1:${process.env.WORKER_HEALTH_PORT ?? 8081}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
