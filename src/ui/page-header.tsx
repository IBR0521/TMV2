import { type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { ICON_STROKE } from './icons';

/**
 * Every office page starts the same way (docs/spec/approved-mockups.md,
 * Shared office layout): the title and a muted subline on the left, the global
 * search field and this screen's one primary button on the right.
 */
export function PageHeader({
  title,
  subline,
  action,
}: {
  title: string;
  subline?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {subline && <p className="mt-0.5 text-label text-text-muted">{subline}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GlobalSearch />
        {action}
      </div>
    </header>
  );
}

/**
 * The search box is in the shell from phase 1; it finds nothing until there is
 * something to find (phase 3 onwards).
 */
function GlobalSearch() {
  return (
    <div className="relative">
      <Search
        size={15}
        strokeWidth={ICON_STROKE}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        aria-hidden
      />
      <input
        type="search"
        data-testid="global-search"
        aria-label="Search loads, drivers, invoices"
        placeholder="Search loads, drivers, invoices"
        className="h-[38px] w-full min-w-0 rounded-md border border-input bg-surface pr-3 pl-9 text-body text-text focus:border-primary focus:outline-none sm:w-[280px]"
      />
    </div>
  );
}
