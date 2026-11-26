import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Import and export' };

export default async function Page() {
  await requireSection('settings');

  return (
    <>
      <PageHeader title="Import and export" subtitle="Spreadsheet import, CSV and QuickBooks exports">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Import" />
        <EmptyState title="Nothing here yet" hint="Import and export arrive in phase 2." />
      </Panel>
    </>
  );
}
