import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  /**
   * Each suite has its own test directory, so the kit's snapshot template
   * ({testDir}/__baseline__) resolves to tests/visual/__baseline__ where the
   * owner's baselines live. They carry no platform suffix on purpose: every
   * run compares against the same four images.
   */
  snapshotPathTemplate: '{testDir}/__baseline__/{arg}{ext}',
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
    colorScheme: 'dark',
  },
  projects: [
    { name: 'office', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'visual', testDir: './tests/visual', use: { ...devices['Desktop Chrome'] } },
  ],

  /**
   * Two processes, because the spine of phase 1 crosses both: a change in the
   * web app queues a job, and the worker is what turns it into a card on
   * Today. NEXT_PUBLIC_DESIGN_PREVIEW makes /design-preview reachable so the
   * visual test can render the approved screens.
   */
  webServer: [
    {
      command: process.env.CI ? 'pnpm build && pnpm start' : 'pnpm dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { NEXT_PUBLIC_DESIGN_PREVIEW: '1' },
    },
    {
      command: 'pnpm worker',
      url: `http://127.0.0.1:${process.env.WORKER_HEALTH_PORT ?? 8081}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
