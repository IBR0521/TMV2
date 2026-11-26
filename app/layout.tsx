import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TruckMates', template: '%s · TruckMates' },
  description: 'Dispatch, billing and driver pay for carriers with 5 to 50 trucks.',
  applicationName: 'TruckMates',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05080F',
  colorScheme: 'dark',
};

/** Dark is the default and, in v2, the only theme (CLAUDE.md, rule 7). */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
