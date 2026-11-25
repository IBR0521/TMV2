import { type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from './cn';

/**
 * A few panels with hairline dividers, not a wall of cards
 * (design/README.md, principle 2): surface fill, one hairline outline,
 * radius-lg, and rows inside split by 1px lines.
 */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  count,
  link,
}: {
  title: string;
  count?: number | string;
  link?: { label: string; href: string };
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
      <h2 className="text-section-title">
        {title}
        {count !== undefined && <span className="ml-2 text-label text-text-muted">{count}</span>}
      </h2>
      {link && (
        <Link href={link.href} className="text-label text-link hover:underline">
          {link.label}
        </Link>
      )}
    </header>
  );
}

/** One fact-line row. Rows are separated by lines, never by gaps. */
export function PanelRow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0', className)}>
      {children}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}
