import { Breadcrumb, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireSection } from '@/server/guard';
import { listDrivers } from '@/server/services/fleet';
import { TrailerForm, TruckForm } from '../unit-form';

export const metadata = { title: 'New unit' };

/** The same two forms the unit page uses, with nothing in them yet. */
export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const ctx = await requireSection('fleet');
  const { kind } = await searchParams;
  const trailer = kind === 'trailer';

  const drivers = trailer ? [] : await listDrivers(ctx);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Trucks and trailers', href: '/fleet/units' },
          { label: trailer ? 'New trailer' : 'New truck' },
        ]}
      />

      <PageHeader
        title={trailer ? 'New trailer' : 'New truck'}
        subtitle="Registration and inspection dates are added once the unit exists."
      />

      <Panel label={trailer ? 'Trailer' : 'Truck'}>
        <PanelHeader title="Details" />
        {trailer ? (
          <TrailerForm />
        ) : (
          <TruckForm drivers={drivers.map((driver) => ({ id: driver.id, name: driver.name }))} />
        )}
      </Panel>
    </>
  );
}
