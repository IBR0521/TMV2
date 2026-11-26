'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * The detail opens beside the list, not instead of it.
 *
 * Clicking a load in a list of forty should not throw the list away: the
 * dispatcher is working through them. On a phone it covers the screen, because
 * there is nowhere to put it.
 */
export function DetailPanel({
  title,
  subtitle,
  onClose,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside
      aria-label="Details"
      className="fixed inset-0 z-30 flex flex-col border-border bg-bg md:static md:inset-auto md:z-auto md:w-[420px] md:shrink-0 md:border-l"
    >
      <header className="flex items-start gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">{title}</div>
          {subtitle && <div className="mt-1 text-label text-text-muted">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="row flex h-7 w-7 shrink-0 items-center justify-center text-text-muted hover:text-text"
        >
          <X size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">{children}</div>

      {actions && (
        <footer className="flex items-center gap-2 border-t border-border px-6 py-4">
          {actions}
        </footer>
      )}
    </aside>
  );
}

/** A labelled fact inside the panel. Label above, value below, never a table. */
export function Fact({
  label,
  children,
  nums,
}: {
  label: string;
  children: ReactNode;
  nums?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-body ${nums ? 'nums' : ''}`}>{children}</dd>
    </div>
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <h3 className="text-section-title">{title}</h3>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
