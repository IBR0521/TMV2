import { type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from './cn';

/**
 * A panel is a surface one step above the page with a hairline edge, not a box
 * drawn in grey. Its rows carry no dividers: they separate by lifting under
 * the pointer (design/README.md).
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
    <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
      <h2 className="flex items-baseline gap-2 text-section-title">
        {title}
        {count !== undefined && <span className="nums text-label text-text-muted">{count}</span>}
      </h2>
      {link && (
        <Link href={link.href} className="text-label text-text-muted hover:text-text">
          {link.label}
        </Link>
      )}
    </header>
  );
}

/** One fact-line row. Lifts under the pointer; never bordered. */
export function PanelRow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('row mx-2 flex items-center justify-between gap-4 px-2 py-2.5', className)}>
      {children}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-4 pt-1 pb-4', className)}>{children}</div>;
}

/** The bottom edge of a panel that ends in rows, so the last row can breathe. */
export function PanelFoot() {
  return <div className="h-2" />;
}
