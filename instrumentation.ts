import * as Sentry from '@sentry/nextjs';

/**
 * Server and edge error reporting. Sentry stays off until the owner supplies a
 * DSN, so local and CI runs are unaffected.
 *
 * docs/spec/architecture.md: errors carry the company id and no customer data.
 * The company id is tagged in src/server/context.ts; scrub() below is what
 * keeps everything else out, rather than trusting a default to stay put.
 */
export function register(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    maxValueLength: 500,
    beforeSend: scrub,
  });
}

/** Keeps a carrier's data out of an error report. */
export function scrub<T extends Sentry.ErrorEvent>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  if (event.contexts?.response) {
    delete event.contexts.response;
  }
  return event;
}

export const onRequestError = Sentry.captureRequestError;
