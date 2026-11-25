import { redirect } from 'next/navigation';
import { PageHeader } from '@/ui/page-header';
import { Panel, PanelHeader } from '@/ui/panel';
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
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(now);
}

/**
 * The Today inbox: the ready-made next steps the worker has put there.
 *
 * The summary strip and the Trucks panel from the approved mockup need loads
 * and trucks, so they arrive with phases 2 and 3. Phase 1 builds the "Needs
 * you" panel, live.
 */
export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');

  const [company, suggestions] = await Promise.all([getCompany(ctx), listOpen(ctx)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        subline={longDate(new Date(), company.timezone)}
        action={<TestEventButton />}
      />

      <Panel>
        <PanelHeader title="Needs you" count={suggestions.length} />
        {suggestions.length === 0 ? (
          <EmptyState
            title="Nothing needs you"
            detail="New loads, invoices to send and problems to fix show up here as they happen."
          />
        ) : (
          <SuggestionList rows={suggestions} />
        )}
      </Panel>

      <SuggestionsLive companyId={ctx.companyId} />
    </div>
  );
}
