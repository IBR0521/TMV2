import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  /**
   * Development only. Everything local is addressed as 127.0.0.1 (that is what
   * supabase/config.toml uses for its redirect URLs), and `next dev` otherwise
   * treats that as a cross-origin host and refuses to serve its own chunks —
   * which leaves every page rendered but never hydrated.
   */
  allowedDevOrigins: ['127.0.0.1'],
};

// Sentry only wires itself up when a DSN is configured, so local and CI runs
// without Sentry credentials behave exactly like production minus reporting.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
    })
  : nextConfig;
