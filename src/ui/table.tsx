'use client';

import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from './cn';

/**
 * A data table, not a list of cards.
 *
 * Fifty loads is a table: columns you can sort, a checkbox to act on many at
 * once, figures that line up down the right, and a header that stays put while
 * the rows scroll. Rows select with a click and never move about.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <table className={cn('w-full border-collapse text-body', className)}>{children}</table>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-bg">
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export type SortDirection = 'asc' | 'desc' | null;

export function Th({
  children,
  sort,
  align = 'left',
  width,
  onSort,
}: {
  children?: ReactNode;
  sort?: SortDirection;
  align?: 'left' | 'right' | 'center';
  width?: string;
  onSort?: () => void;
}) {
  const content = (
    <span
      className={cn(
        'flex items-center gap-1.5 text-label text-text-muted',
        align === 'right' && 'justify-end',
        align === 'center' && 'justify-center',
      )}
    >
      {children}
      {sort !== undefined &&
        (sort === 'asc' ? (
          <ArrowUp size={12} strokeWidth={2} className="text-text-secondary" aria-hidden />
        ) : sort === 'desc' ? (
          <ArrowDown size={12} strokeWidth={2} className="text-text-secondary" aria-hidden />
        ) : (
          <ChevronsUpDown size={12} strokeWidth={2} className="text-text-faint" aria-hidden />
        ))}
    </span>
  );

  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className="px-3 py-2 text-left font-normal first:pl-5 last:pr-5"
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
    >
      {onSort ? (
        <button type="button" onClick={onSort} className="row -mx-1 px-1 py-0.5">
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export function Tr({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      aria-selected={selected}
      className={cn(
        'border-b border-border/60 transition-colors',
        selected ? 'bg-surface-raised' : 'hover:bg-surface',
        onClick && 'cursor-pointer',
      )}
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  nums,
  muted,
  align = 'left',
  className,
}: {
  children?: ReactNode;
  nums?: boolean;
  muted?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle first:pl-5 last:pr-5',
        nums && 'nums',
        muted && 'text-text-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Checkbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      className="h-3.5 w-3.5 cursor-pointer appearance-none rounded-[3px] border border-input bg-surface-raised checked:border-primary checked:bg-primary"
      style={
        checked
          ? {
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.2 4.8 8.5 9.5 3.8' fill='none' stroke='%231A1000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
              backgroundSize: '12px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    />
  );
}

/** Appears only while rows are selected, and says what will happen to them. */
export function SelectionBar({
  count,
  children,
  onClear,
}: {
  count: number;
  children: ReactNode;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-5 flex flex-wrap items-center gap-3 rounded-lg border border-border-input bg-selected px-4 py-2.5">
      <span className="text-body-strong">
        <span className="nums">{count}</span> selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="row ml-auto px-2 py-1 text-label text-text-muted hover:text-text"
      >
        Clear
      </button>
    </div>
  );
}
