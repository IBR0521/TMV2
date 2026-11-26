import {
  Button,
  type Column,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  SearchField,
  StatusChip,
  Tabs,
  TextLink,
} from '@/ui';
import { driverStatusLabel, driverTypeLabel, formatPhone } from '@/domain/fleet';
import { requireSection } from '@/server/guard';
import { listDrivers, type DriverRow } from '@/server/services/fleet';

export const metadata = { title: 'Drivers' };

/**
 * Drivers, with status and expiring documents (docs/spec/screens.md, row 12).
 *
 * List pattern from design/KIT.md: PageHeader with search and one primary
 * button, then a Panel with a DataTable. The expiry chip is the only coloured
 * thing on the screen, and only when something is actually due.
 *
 * On an empty list the primary button moves into the EmptyState, so there is
 * still exactly one on the screen.
 */
const COLUMNS: Column<DriverRow>[] = [
  {
    key: 'name',
    header: 'Driver',
    render: (driver) => <TextLink href={`/fleet/drivers/${driver.id}`}>{driver.name}</TextLink>,
  },
  { key: 'type', header: 'Type', render: (driver) => driverTypeLabel(driver.type) },
  {
    key: 'phone',
    header: 'Phone',
    render: (driver) => (driver.phone === null ? '—' : formatPhone(driver.phone)),
  },
  { key: 'home', header: 'Home', render: (driver) => driver.homeLocation ?? '—' },
  { key: 'truck', header: 'Truck owned', render: (driver) => driver.truckUnit ?? '—' },
  {
    key: 'paperwork',
    header: 'Paperwork',
    render: (driver) =>
      driver.worstExpiry === null ? (
        <StatusChip tone="idle">In order</StatusChip>
      ) : (
        <StatusChip tone="warning" dot>
          {driver.worstExpiry.label}
        </StatusChip>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (driver) =>
      driver.status === 'active' ? (
        <StatusChip tone="idle">Active</StatusChip>
      ) : (
        <StatusChip tone="normal">{driverStatusLabel(driver.status)}</StatusChip>
      ),
  },
];

function subtitleFor(drivers: DriverRow[]): string {
  const count = `${drivers.length} ${drivers.length === 1 ? 'driver' : 'drivers'}`;
  const due = drivers.filter((driver) => driver.worstExpiry !== null).length;
  return due === 0 ? count : `${count} · ${due} with paperwork due`;
}

export default async function DriversPage() {
  const ctx = await requireSection('fleet');
  const drivers = await listDrivers(ctx);
  const empty = drivers.length === 0;

  return (
    <>
      <PageHeader title="Drivers" subtitle={subtitleFor(drivers)}>
        <SearchField action="/search" />
        {empty ? null : (
          <Button variant="primary" href="/fleet/drivers/new">
            New driver
          </Button>
        )}
      </PageHeader>

      <Tabs
        items={[
          { label: 'Drivers', href: '/fleet', active: true, count: drivers.length },
          { label: 'Trucks and trailers', href: '/fleet/units' },
        ]}
      />

      <Panel label="Drivers">
        <PanelHeader title="Drivers" count={drivers.length} />

        {empty ? (
          <EmptyState
            title="No drivers yet"
            hint="Add them one at a time, or import a spreadsheet from Settings."
            action={
              <Button variant="primary" href="/fleet/drivers/new">
                New driver
              </Button>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} rows={drivers} rowKey={(driver) => driver.id} />
        )}
      </Panel>
    </>
  );
}
