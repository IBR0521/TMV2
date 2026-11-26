import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Company' };

export default async function Page() {
  await requireSection('settings');

  return (
    <>
      <PageHeader title="Company" subtitle="Name, MC and DOT, time zone">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Carrier details" />
        <EmptyState title="Nothing here yet" hint="Editing company details arrives in phase 2." />
      </Panel>
    </>
  );
}
