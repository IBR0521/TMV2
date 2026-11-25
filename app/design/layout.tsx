import { notFound } from 'next/navigation';
import './design.css';

export const metadata = {
  title: 'Design directions',
  robots: { index: false, follow: false },
};

/**
 * Three candidate directions for the office app, for the owner to choose from.
 *
 * Development only: in production these routes do not exist. They use the
 * sample figures from docs/spec/approved-mockups.md and touch no data.
 */
export default function DesignLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
