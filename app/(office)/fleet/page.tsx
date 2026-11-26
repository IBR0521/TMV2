import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Fleet' };

export default async function Page() {
  await requireSection('fleet');

  return (
    <>
      <PageHeader title="Fleet" subtitle="Drivers, trucks, trailers and what is due">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Drivers" />
        <EmptyState title="Nothing here yet" hint="Fleet and customers arrive in phase 2." />
      </Panel>
    </>
  );
}
