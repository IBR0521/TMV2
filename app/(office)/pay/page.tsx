import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Driver pay' };

export default async function Page() {
  await requireSection('pay');

  return (
    <>
      <PageHeader title="Driver pay" subtitle="Settlements for each pay period">
        <SearchField action="/search" />
      </PageHeader>

      <Panel>
        <PanelHeader title="Settlements" />
        <EmptyState title="Nothing here yet" hint="Settlements arrive in phase 6." />
      </Panel>
    </>
  );
}
