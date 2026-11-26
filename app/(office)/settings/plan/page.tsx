import { EmptyState, PageHeader, Panel, PanelHeader, SearchField } from '@/ui';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Plan and billing' };

export default async function Page() {
  await requireSection('settings');

  return (
    <>
      <PageHeader title="Plan and billing" subtitle="Plan, trucks counted, AI quota used">
        <SearchField />
      </PageHeader>

      <Panel>
        <PanelHeader title="Plan" />
        <EmptyState title="Nothing here yet" hint="Paddle checkout arrives in phase 8." />
      </Panel>
    </>
  );
}
