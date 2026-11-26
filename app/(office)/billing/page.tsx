import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Billing' };

export default async function Page() {
  await requireSection('billing');

  return (
    <>
      <PageHeader title="Billing" subtitle="Invoices, payments and factoring">
        <SearchField action="/search" />
      </PageHeader>

      <Panel>
        <PanelHeader title="Invoices" />
        <EmptyState title="Nothing here yet" hint="Invoicing and factoring arrive in phase 5." />
      </Panel>
    </>
  );
}
