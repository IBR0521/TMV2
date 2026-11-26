import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Costs' };

export default async function Page() {
  await requireSection('costs');

  return (
    <>
      <PageHeader title="Costs" subtitle="Expenses, fuel and IFTA">
        <SearchField action="/search" />
      </PageHeader>

      <Panel>
        <PanelHeader title="Expenses" />
        <EmptyState title="Nothing here yet" hint="Costs and IFTA arrive in phase 7." />
      </Panel>
    </>
  );
}
