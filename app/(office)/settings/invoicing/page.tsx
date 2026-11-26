import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Invoicing and factoring' };

export default async function Page() {
  await requireSection('settings');

  return (
    <>
      <PageHeader title="Invoicing and factoring" subtitle="Numbering, terms, invoice layout, factoring companies">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Invoicing" />
        <EmptyState title="Nothing here yet" hint="Invoicing settings arrive in phase 5." />
      </Panel>
    </>
  );
}
