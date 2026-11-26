import { redirect } from 'next/navigation';
import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
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
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(now);
}

/**
 * The Today inbox: the ready-made next steps the worker has put there.
 *
 * The approved screen also carries a summary strip and a Trucks panel; both
 * need loads and trucks, so they arrive with phases 2 and 3. Phase 1 is the
 * "Needs you" panel, live over Realtime.
 */
export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');

  const [company, suggestions] = await Promise.all([getCompany(ctx), listOpen(ctx)]);

  return (
    <>
      <PageHeader title="Today" subtitle={longDate(new Date(), company.timezone)}>
        <SearchField />
        <TestEventButton />
      </PageHeader>

      <Panel label="Needs you">
        <PanelHeader title="Needs you" count={suggestions.length} />
        {suggestions.length === 0 ? (
          <EmptyState
            title="Nothing needs you"
            hint="New loads, invoices to send and problems to fix show up here as they happen."
          />
        ) : (
          <SuggestionList rows={suggestions} />
        )}
      </Panel>

      <SuggestionsLive companyId={ctx.companyId} />
    </>
  );
}
