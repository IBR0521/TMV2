import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Automation' };

export default async function Page() {
  await requireSection('settings');

  return (
    <>
      <PageHeader title="Automation" subtitle="Each rule set to auto, suggest or off">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Rules" />
        <EmptyState title="Nothing here yet" hint="Choosing rule modes arrives in phase 3." />
      </Panel>
    </>
  );
}
