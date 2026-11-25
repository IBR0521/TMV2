/**
 * Stands in for @sentry/nextjs in the unit and action test runs: the tests are
 * about our own code, and Sentry needs a Next.js runtime it does not have here.
 */
export function setTag(): void {}
export function setUser(): void {}
export function captureException(): void {}
export function captureMessage(): void {}
export function init(): void {}
export function captureRequestError(): void {}
export function captureRouterTransitionStart(): void {}
export function withSentryConfig<T>(config: T): T {
  return config;
}
