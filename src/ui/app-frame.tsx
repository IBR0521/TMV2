import { type ReactNode } from 'react';
import Link from 'next/link';
import { Bell, CircleHelp, Search } from 'lucide-react';
import { Mark } from './sidebar';

/**
 * The application frame.
 *
 * Three fixed parts and one that changes: a top bar that belongs to the
 * account, a left rail that belongs to the carrier, a workspace toolbar that
 * belongs to the screen, and the screen itself. Every office screen is built
 * inside this, so moving between them never moves the furniture.
 */
export function TopBar({
  companyName,
  email,
  role,
}: {
  companyName: string;
  email: string;
  role: string;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
      <Link href="/today" className="flex shrink-0 items-center gap-2.5 pr-1">
        <Mark />
        <span className="hidden text-body-strong sm:block">TruckMates</span>
      </Link>

      <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />

      <span className="hidden min-w-0 shrink items-baseline gap-2 sm:flex">
        <span className="truncate text-body text-text-secondary">{companyName}</span>
      </span>

      <div className="mx-auto hidden w-full max-w-[420px] md:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <IconButton label="What's new">
          <Bell size={15} strokeWidth={1.75} aria-hidden />
        </IconButton>
        <IconButton label="Help">
          <CircleHelp size={15} strokeWidth={1.75} aria-hidden />
        </IconButton>
        <span
          title={`${email} · ${role}`}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-label text-text-secondary"
        >
          {email.slice(0, 1).toUpperCase()}
        </span>
      </div>
    </header>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="row flex h-7 w-7 items-center justify-center text-text-muted hover:text-text"
    >
      {children}
    </button>
  );
}

/**
 * The search box is in the frame from phase 1; it finds nothing until there is
 * something to find (phase 3 onwards).
 */
function GlobalSearch() {
  return (
    <div className="relative">
      <Search
        size={14}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        type="search"
        data-testid="global-search"
        aria-label="Search loads, drivers, invoices"
        placeholder="Search loads, drivers, invoices"
        className="h-7 w-full rounded-md bg-surface pr-16 pl-8 text-body text-text transition-colors hover:bg-surface-raised focus:bg-surface-raised focus:outline-none"
      />
      <kbd className="nums pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-label text-text-faint">
        ⌘K
      </kbd>
    </div>
  );
}

/**
 * The toolbar that belongs to a screen: what you are looking at on the left,
 * what you can do about it on the right, and the tabs or filters that narrow
 * it underneath.
 */
export function Workspace({
  title,
  count,
  subline,
  actions,
  toolbar,
  children,
}: {
  title: string;
  count?: string;
  subline?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
        <h1 className="text-page-title">{title}</h1>
        {count && <span className="nums text-body text-text-muted">{count}</span>}
        {subline && <span className="text-label text-text-muted">{subline}</span>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 pb-3">
          {toolbar}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

/** Padded content for a screen that is not a table: settings, forms, Today. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1100px] px-5 py-5">{children}</div>
    </div>
  );
}

/**
 * Says plainly that a screen is showing sample rows because its phase has not
 * been built yet. Better than an empty state that teaches nothing, and better
 * than quietly implying the data is real.
 */
export function SampleNotice({ phase, what }: { phase: string; what: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-5 py-2">
      <span className="rounded-chip bg-[var(--color-danger-fill)] px-2 py-0.5 text-label text-danger">
        Sample
      </span>
      <span className="text-label text-text-secondary">
        {what} is built in {phase}. These rows are from the spec, not the database.
      </span>
    </div>
  );
}
