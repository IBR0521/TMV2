import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Three of the four test layers in docs/spec/architecture.md live here:
 *   domain  - pure functions, no I/O, milliseconds
 *   actions - every exported server action is wrapped and role-checked
 *   rls     - two companies against the local Supabase database
 * The fourth (end to end) is Playwright; see playwright.config.ts.
 */
const sentryStub = fileURLToPath(new URL('./tests/support/sentry-stub.ts', import.meta.url));

/** Sentry needs a Next.js runtime these tests do not have. */
const resolve = {
  tsconfigPaths: true,
  alias: { '@sentry/nextjs': sentryStub },
} as const;

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: {
          name: 'domain',
          include: ['tests/domain/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve,
        test: {
          name: 'actions',
          include: ['tests/actions/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
        },
      },
      {
        resolve,
        test: {
          name: 'rls',
          include: ['tests/rls/**/*.test.ts'],
          environment: 'node',
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // The RLS tests share two companies; running files in parallel would
          // let one file's cleanup pull the ground out from under another.
          fileParallelism: false,
        },
      },
    ],
  },
});
