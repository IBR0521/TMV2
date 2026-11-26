import { Breadcrumb, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireSection } from '@/server/guard';
import { DriverForm } from '../driver-form';

export const metadata = { title: 'New driver' };

/** The same form the driver page uses, with nothing in it yet. */
export default async function NewDriverPage() {
  await requireSection('fleet');

  return (
    <>
      <Breadcrumb items={[{ label: 'Drivers', href: '/fleet' }, { label: 'New driver' }]} />

      <PageHeader title="New driver" subtitle="Paperwork and pay are added once they exist." />

      <Panel label="Driver">
        <PanelHeader title="Details" />
        <DriverForm />
      </Panel>
    </>
  );
}
