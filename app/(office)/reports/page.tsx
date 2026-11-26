import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Reports' };

export default async function Page() {
  await requireSection('reports');

  return (
    <>
      <PageHeader title="Reports" subtitle="Profit per load, truck, driver and lane">
        <SearchField action="/search" />
      </PageHeader>

      <Panel>
        <PanelHeader title="Reports" />
        <EmptyState title="Nothing here yet" hint="Reports arrive in phase 7." />
      </Panel>
    </>
  );
}
