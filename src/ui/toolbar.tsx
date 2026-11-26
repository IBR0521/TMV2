'use client';

import { type ReactNode } from 'react';
import { Check, ListFilter } from 'lucide-react';
import { cn } from './cn';

/** The saved views a screen offers, as tabs rather than a dropdown. */
export function ViewTabs({
  views,
  active,
  onPick,
}: {
  views: { key: string; label: string; count?: number }[];
  active: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto" role="tablist">
      {views.map((view) => (
        <button
          key={view.key}
          type="button"
          role="tab"
          aria-selected={view.key === active}
          onClick={() => onPick(view.key)}
          className={cn(
            'row flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-body whitespace-nowrap',
            view.key === active ? 'bg-surface-raised text-text' : 'text-text-secondary',
          )}
        >
          {view.label}
          {view.count !== undefined && (
            <span className="nums text-label text-text-muted">{view.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** A filter that is on shows what it is filtering by, not just that it is on. */
export function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value?: string;
  onClear?: () => void;
}) {
  const on = value !== undefined;

  return (
    <button
      type="button"
      onClick={onClear}
      className={cn(
        'row flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-body',
        on ? 'bg-surface-raised text-text' : 'text-text-secondary',
      )}
    >
      {on ? (
        <Check size={13} strokeWidth={2} className="text-primary" aria-hidden />
      ) : (
        <ListFilter size={13} strokeWidth={1.75} className="text-text-muted" aria-hidden />
      )}
      {label}
      {on && <span className="text-text-secondary">{value}</span>}
    </button>
  );
}

export function ToolbarSpacer({ children }: { children?: ReactNode }) {
  return <div className="ml-auto flex items-center gap-2">{children}</div>;
}
