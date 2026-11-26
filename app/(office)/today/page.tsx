import { redirect } from 'next/navigation';
import { Button, EmptyState, ListRow, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { remainingSetup } from '@/server/services/setup';
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
 * need loads, so they arrive with phase 3.
 *
 * Above the inbox, while anything is missing, sits the short checklist the
 * signup flow promises. It is worked out from what is actually in the
 * company, so it disappears as the carrier fills it in — whether they did it
 * through the wizard or afterwards — and never has to be dismissed.
 */
export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx) redirect('/login');

  const [company, suggestions, setup] = await Promise.all([
    getCompany(ctx),
    listOpen(ctx),
    remainingSetup(ctx),
  ]);

  return (
    <>
      <PageHeader title="Today" subtitle={longDate(new Date(), company.timezone)}>
        <SearchField />
        <TestEventButton />
      </PageHeader>

      {setup.length === 0 ? null : (
        <Panel label="Finish setting up">
          <PanelHeader title="Finish setting up" count={setup.length} />
          {setup.map((task) => (
            <ListRow
              key={task.key}
              label={task.title}
              title={task.detail}
              action={
                <Button size="sm" href={task.href}>
                  Do it
                </Button>
              }
            />
          ))}
        </Panel>
      )}

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
