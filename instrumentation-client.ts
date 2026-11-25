import * as Sentry from '@sentry/nextjs';
import { scrub } from './instrumentation';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    maxValueLength: 500,
    beforeSend: scrub,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
