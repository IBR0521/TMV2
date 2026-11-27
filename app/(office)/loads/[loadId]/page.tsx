import { notFound } from 'next/navigation';
import {
  Amount,
  AmountRow,
  Breadcrumb,
  Cell,
  CellGroup,
  CellLabel,
  Columns,
  EmptyState,
  MainColumn,
  Panel,
  PanelHeader,
  SideColumn,
  StatusChip,
  Tabs,
  Timeline,
} from '@/ui';
import { chargeKindLabel, loadStatusLabel, nextStep, nextStepLabel } from '@/domain/load';
import { wallClockOf } from '@/domain/time';
import { requireSection } from '@/server/guard';
import { listFacilities } from '@/server/services/facilities';
import { getLoad, timeline, type StopRow } from '@/server/services/loads';
import { LoadHeader } from './load-header';
import { Charges } from './charges';
import { Stops, type StopView } from './stops';

export const metadata = { title: 'Load' };

/**
 * The load page (docs/spec/screens.md, row 4), assembled from the approved
 * screen in src/ui/previews/LoadPreview.tsx: breadcrumb, header with a status
 * chip and one primary button, tabs, then the stops and the money beside a
 * timeline.
 *
 * Two of the approved tabs are not here yet. Documents arrives with phase 3b,
 * check calls with their own step. A tab that leads nowhere is worse than a
 * tab that is not there, so they appear when they do something.
 */
function when(iso: string | null, timezone: string): string {
  if (iso === null) return 'No appointment';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(iso));
}

function stopState(stop: StopRow, stops: StopRow[]): 'done' | 'current' | 'upcoming' {
  if (stop.departedAt !== null) return 'done';
  if (stop.arrivedAt !== null) return 'current';
  // The first stop nobody has left yet is the one the truck is heading for.
  const firstOpen = stops.find((other) => other.departedAt === null);
  return firstOpen?.id === stop.id ? 'current' : 'upcoming';
}

function stopDetail(stop: StopRow): string {
  const parts = [
    stop.arrivedAt === null ? null : `Arrived ${when(stop.arrivedAt, stop.timezone)}`,
    stop.departedAt === null ? null : `Left ${when(stop.departedAt, stop.timezone)}`,
    stop.reference === null ? null : `Ref ${stop.reference}`,
    stop.notes,
  ].filter((part): part is string => part !== null && part !== '');

  return parts.join(' · ');
}

export default async function LoadPage({
  params,
  searchParams,
}: {
  params: Promise<{ loadId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await requireSection('loads');
  const { loadId } = await params;
  const { tab } = await searchParams;

  const detail = await getLoad(ctx, loadId);
  if (detail === null) notFound();

  const { load, stops, charges } = detail;
  const [history, facilities] = await Promise.all([timeline(ctx, loadId), listFacilities(ctx)]);

  // A delivered or cancelled load is a record, not a plan: its stops stay as
  // they were run.
  const canEdit = load.status !== 'delivered' && load.status !== 'cancelled';

  const stopViews: StopView[] = stops.map((stop) => ({
    id: stop.id,
    seq: stop.seq,
    type: stop.type,
    facilityId: stop.facilityId,
    facilityName: stop.facilityName,
    apptStart: stop.apptStart,
    timezone: stop.timezone,
    arrivedAt: stop.arrivedAt,
    departedAt: stop.departedAt,
    arrivedWall: stop.arrivedAt === null ? '' : wallClockOf(stop.arrivedAt, stop.timezone) ?? '',
    departedWall:
      stop.departedAt === null ? '' : wallClockOf(stop.departedAt, stop.timezone) ?? '',
    // "Now" at the dock, not wherever the dispatcher is sitting.
    nowWall: wallClockOf(new Date().toISOString(), stop.timezone) ?? '',
    reference: stop.reference,
    notes: stop.notes,
    state: stopState(stop, stops),
    label: `${stop.type === 'pickup' ? 'Pickup' : 'Delivery'} · ${when(stop.apptStart, stop.timezone)}`,
    detail: stopDetail(stop),
  }));

  const step = nextStep(load.status);
  const stepLabel = nextStepLabel(load.status);

  const lane =
    load.from === null && load.to === null
      ? 'No stops yet'
      : `${load.from ?? '—'} → ${load.to ?? '—'}`;

  const subtitle = [
    load.customerName,
    load.brokerRef === null ? null : `Ref ${load.brokerRef}`,
    load.driverName,
    load.truckUnit === null ? null : `Unit ${load.truckUnit}`,
    load.totalMiles === null ? null : `${load.totalMiles.toLocaleString('en-US')} mi`,
  ]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');

  const showing = tab === 'charges' ? 'charges' : 'overview';

  return (
    <>
      <Breadcrumb
        items={[{ label: 'Loads', href: '/loads' }, { label: `#${load.loadNumber}` }]}
      />

      <LoadHeader
        loadId={load.id}
        title={`#${load.loadNumber} · ${lane}`}
        subtitle={subtitle === '' ? 'Nothing on it yet' : subtitle}
        status={
          load.status === 'cancelled' ? (
            <StatusChip tone="warning">Cancelled</StatusChip>
          ) : (
            <StatusChip tone={load.status === 'delivered' ? 'idle' : 'normal'}>
              {loadStatusLabel(load.status)}
            </StatusChip>
          )
        }
        next={step === null || stepLabel === null ? null : { to: step, label: stepLabel }}
      />

      <Tabs
        items={[
          { label: 'Overview', href: `/loads/${load.id}`, active: showing === 'overview' },
          {
            label: 'Charges',
            href: `/loads/${load.id}?tab=charges`,
            active: showing === 'charges',
            count: charges.length,
          },
        ]}
      />

      {showing === 'charges' ? (
        <Charges loadId={load.id} charges={charges} rateCents={load.rateCents} />
      ) : (
        <Columns gap="md">
          <MainColumn>
            <Panel label="Stops">
              <PanelHeader title="Stops" count={stops.length} />
              <Stops
                loadId={load.id}
                stops={stopViews}
                facilities={facilities.map((facility) => ({
                  id: facility.id,
                  name: facility.name,
                }))}
                canEdit={canEdit}
              />
            </Panel>

            <Panel label="Money">
              <PanelHeader title="Money" />
              <CellGroup>
                <Cell>
                  <CellLabel>Revenue</CellLabel>
                  {charges
                    .filter((charge) => charge.billCustomer)
                    .map((charge) => (
                      <AmountRow
                        key={charge.id}
                        label={charge.description ?? chargeKindLabel(charge.kind)}
                        cents={charge.amountCents}
                      />
                    ))}
                  <AmountRow label="Total" cents={load.rateCents} total />
                </Cell>

                <Cell>
                  <CellLabel>Costs, estimated</CellLabel>
                  <AmountRow label="Driver pay" cents={load.estimate.driverCents} />
                  <AmountRow label="Fuel" cents={load.estimate.fuelCents} />
                  <AmountRow
                    label="Total"
                    cents={load.estimate.driverCents + load.estimate.fuelCents}
                    total
                  />
                </Cell>

                <Cell basis="sm">
                  <CellLabel>Profit, estimated</CellLabel>
                  <Amount cents={load.estimate.profitCents} className="text-24 font-medium" />
                  <div className="text-text-muted">
                    {load.estimate.perMileCents === null
                      ? 'Miles not entered yet'
                      : `${(load.estimate.perMileCents / 100).toFixed(2)} per mile`}
                  </div>
                  <div className="text-12 text-text-muted">
                    Driver pay and fuel are placeholders until phases 6 and 7.
                  </div>
                </Cell>
              </CellGroup>
            </Panel>
          </MainColumn>

          <SideColumn>
            <Panel label="Timeline">
              <PanelHeader title="Timeline" />
              {history.length === 0 ? (
                <EmptyState title="Nothing has happened yet" />
              ) : (
                <Timeline
                  items={history.map((entry) => ({
                    time: new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(new Date(entry.at)),
                    text: entry.what,
                  }))}
                />
              )}
            </Panel>
          </SideColumn>
        </Columns>
      )}
    </>
  );
}
