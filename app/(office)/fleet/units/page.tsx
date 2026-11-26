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
import { trailerTypeLabel, unitStatusLabel } from '@/domain/fleet';
import type { ComplianceKind, Expiry, TrailerType, UnitStatus } from '@/domain/fleet';
import { requireSection } from '@/server/guard';
import { listTrailers, listTrucks } from '@/server/services/fleet';

export const metadata = { title: 'Trucks and trailers' };

/**
 * Trucks and trailers in one list with a toggle (docs/spec/screens.md, row
 * 14): "All units with status and what's due".
 *
 * The toggle is a link, not client state, so a filtered list can be shared and
 * the back button works — the same choice the loads screen makes.
 */
type UnitRow = {
  id: string;
  kind: 'truck' | 'trailer';
  unitNumber: string;
  detail: string;
  assigned: string;
  odometer: string;
  status: UnitStatus;
  worstExpiry: (Expiry & { kind: ComplianceKind }) | null;
};

const COLUMNS: Column<UnitRow>[] = [
  {
    key: 'unit',
    header: 'Unit',
    render: (unit) => <TextLink href={`/fleet/units/${unit.id}`}>{unit.unitNumber}</TextLink>,
  },
  { key: 'kind', header: 'Kind', render: (unit) => (unit.kind === 'truck' ? 'Truck' : 'Trailer') },
  { key: 'detail', header: 'Detail', render: (unit) => unit.detail },
  { key: 'assigned', header: 'Owner', render: (unit) => unit.assigned },
  { key: 'odometer', header: 'Odometer', align: 'right', render: (unit) => unit.odometer },
  {
    key: 'paperwork',
    header: 'Paperwork',
    render: (unit) =>
      unit.worstExpiry === null ? (
        <StatusChip tone="idle">In order</StatusChip>
      ) : (
        <StatusChip tone="warning" dot>
          {unit.worstExpiry.label}
        </StatusChip>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (unit) =>
      unit.status === 'active' ? (
        <StatusChip tone="idle">Active</StatusChip>
      ) : (
        <StatusChip tone="warning">{unitStatusLabel(unit.status)}</StatusChip>
      ),
  },
];

function milesLabel(miles: number | null): string {
  return miles === null ? '—' : `${miles.toLocaleString('en-US')} mi`;
}

function truckDetail(vin: string | null, plate: string | null): string {
  if (plate !== null) return plate;
  if (vin !== null) return `VIN …${vin.slice(-6)}`;
  return '—';
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const ctx = await requireSection('fleet');
  const { kind } = await searchParams;

  const [trucks, trailers] = await Promise.all([listTrucks(ctx), listTrailers(ctx)]);

  const truckRows: UnitRow[] = trucks.map((truck) => ({
    id: truck.id,
    kind: 'truck',
    unitNumber: truck.unitNumber,
    detail: truckDetail(truck.vin, truck.plate),
    assigned: truck.ownerDriverName ?? '—',
    odometer: milesLabel(truck.odometerMiles),
    status: truck.status,
    worstExpiry: truck.worstExpiry,
  }));

  const trailerRows: UnitRow[] = trailers.map((trailer) => ({
    id: trailer.id,
    kind: 'trailer',
    unitNumber: trailer.unitNumber,
    detail: trailerTypeLabel(trailer.type as TrailerType),
    assigned: '—',
    odometer: '—',
    status: trailer.status,
    worstExpiry: trailer.worstExpiry,
  }));

  const showing = kind === 'trucks' ? 'trucks' : kind === 'trailers' ? 'trailers' : 'all';
  const rows =
    showing === 'trucks' ? truckRows : showing === 'trailers' ? trailerRows : [...truckRows, ...trailerRows];

  const newTrailer = showing === 'trailers';
  const empty = rows.length === 0;

  return (
    <>
      <PageHeader
        title="Trucks and trailers"
        subtitle={`${trucks.length} ${trucks.length === 1 ? 'truck' : 'trucks'} · ${trailers.length} ${trailers.length === 1 ? 'trailer' : 'trailers'}`}
      >
        <SearchField action="/search" />
        {empty ? null : (
          <Button variant="primary" href={newTrailer ? '/fleet/units/new?kind=trailer' : '/fleet/units/new'}>
            {newTrailer ? 'New trailer' : 'New truck'}
          </Button>
        )}
      </PageHeader>

      <Tabs
        items={[
          { label: 'Drivers', href: '/fleet' },
          {
            label: 'All units',
            href: '/fleet/units',
            active: showing === 'all',
            count: truckRows.length + trailerRows.length,
          },
          {
            label: 'Trucks',
            href: '/fleet/units?kind=trucks',
            active: showing === 'trucks',
            count: truckRows.length,
          },
          {
            label: 'Trailers',
            href: '/fleet/units?kind=trailers',
            active: showing === 'trailers',
            count: trailerRows.length,
          },
        ]}
      />

      <Panel label="Units">
        <PanelHeader title={showing === 'trailers' ? 'Trailers' : showing === 'trucks' ? 'Trucks' : 'All units'} count={rows.length} />

        {empty ? (
          <EmptyState
            title={newTrailer ? 'No trailers yet' : 'No trucks yet'}
            hint="Add them one at a time, or import a spreadsheet from Settings."
            action={
              <Button variant="primary" href={newTrailer ? '/fleet/units/new?kind=trailer' : '/fleet/units/new'}>
                {newTrailer ? 'New trailer' : 'New truck'}
              </Button>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} rows={rows} rowKey={(unit) => unit.id} />
        )}
      </Panel>
    </>
  );
}
