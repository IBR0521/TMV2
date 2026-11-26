import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Customers' };

export default async function Page() {
  await requireSection('customers');

  return (
    <>
      <PageHeader title="Customers" subtitle="Brokers, shippers and the places freight moves between">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Customers" />
        <EmptyState title="Nothing here yet" hint="Fleet and customers arrive in phase 2." />
      </Panel>
    </>
  );
}
