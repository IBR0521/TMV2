import { redirect } from 'next/navigation';
import { Page } from '@/ui/app-frame';
import { PageHeader } from '@/ui/page-header';
import { EmptyState } from '@/ui/empty-state';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { listOpen } from '@/server/services/suggestions';
import { SuggestionList } from './suggestion-list';
import { SuggestionsLive } from './suggestions-live';
import { TestEventButton } from './test-event-button';

export const metadata = { title: 'Today' };

function longDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(now);
}

/**
 * The Today inbox: the ready-made next steps the worker has put there.
 *
 * The summary figures and the fleet column from the design need loads and
 * trucks, so they arrive with phases 2 and 3. Phase 1 is the "Needs you" list,
 * live over Realtime.
 */
export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');

  const [company, suggestions] = await Promise.all([getCompany(ctx), listOpen(ctx)]);

  return (
    <Page>
      <div className="space-y-8">
      <PageHeader
        title="Today"
        subline={longDate(new Date(), company.timezone)}
        action={<TestEventButton />}
      />

      <section>
        <div className="flex items-baseline gap-2 px-2">
          <h2 className="text-section-title">Needs you</h2>
          <span className="nums text-label text-text-muted">{suggestions.length}</span>
        </div>

        <div className="mt-2">
          {suggestions.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                title="Nothing needs you"
                detail="New loads, invoices to send and problems to fix show up here as they happen."
              />
            </div>
          ) : (
            <SuggestionList rows={suggestions} />
          )}
        </div>
      </section>

      <SuggestionsLive companyId={ctx.companyId} />
      </div>
    </Page>
  );
}
