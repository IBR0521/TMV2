'use client';

import { useMemo, useState } from 'react';
import {
  Amount,
  type Column,
  DataTable,
  Panel,
  PanelHeader,
  type Sort,
  StatusChip,
  TextLink,
} from '@/ui';
import { loadStatusLabel } from '@/domain/load';
import type { LoadRow } from '@/server/services/loads';

/**
 * The loads list: sorting lives here, the markup is the kit's. Saved views are
 * links on the page, so a view can be shared and the back button works; only
 * sorting needs state.
 */
function lane(load: LoadRow): string {
  if (load.from === null && load.to === null) return 'No stops yet';
  return `${load.from ?? '—'} → ${load.to ?? '—'}`;
}

function day(iso: string | null): string {
  if (iso === null) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

const COLUMNS: Column<LoadRow>[] = [
  {
    key: 'number',
    header: 'Load',
    render: (load) => <TextLink href={`/loads/${load.id}`}>#{load.loadNumber}</TextLink>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (load) =>
      load.status === 'cancelled' ? (
        <StatusChip tone="warning">Cancelled</StatusChip>
      ) : (
        <StatusChip tone={load.status === 'delivered' ? 'idle' : 'normal'}>
          {loadStatusLabel(load.status)}
        </StatusChip>
      ),
  },
  { key: 'customer', header: 'Customer', sortable: true, render: (load) => load.customerName ?? '—' },
  { key: 'lane', header: 'Lane', render: lane },
  { key: 'pickup', header: 'Pickup', sortable: true, render: (load) => day(load.firstPickupAt) },
  {
    key: 'driver',
    header: 'Driver',
    render: (load) =>
      load.driverName === null ? (
        <span className="text-text-muted">Unassigned</span>
      ) : (
        `${load.truckUnit ?? '—'} · ${load.driverName}`
      ),
  },
  {
    key: 'miles',
    header: 'Miles',
    align: 'right',
    sortable: true,
    render: (load) => (load.totalMiles === null ? '—' : load.totalMiles.toLocaleString('en-US')),
  },
  {
    key: 'rate',
    header: 'Rate',
    align: 'right',
    sortable: true,
    render: (load) => <Amount cents={load.rateCents} decimals={false} />,
  },
  {
    key: 'profit',
    header: 'Est. profit',
    align: 'right',
    sortable: true,
    render: (load) => <Amount cents={load.estimate.profitCents} decimals={false} />,
  },
];

export function LoadsList({ rows, title }: { rows: LoadRow[]; title: string }) {
  const [sort, setSort] = useState<Sort>({ key: 'pickup', direction: 'asc' });

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case 'customer':
          return (a.customerName ?? '').localeCompare(b.customerName ?? '') * factor;
        case 'miles':
          return ((a.totalMiles ?? 0) - (b.totalMiles ?? 0)) * factor;
        case 'rate':
          return (a.rateCents - b.rateCents) * factor;
        case 'profit':
          return (a.estimate.profitCents - b.estimate.profitCents) * factor;
        default:
          return (a.firstPickupAt ?? '').localeCompare(b.firstPickupAt ?? '') * factor;
      }
    });
  }, [rows, sort]);

  function onSort(key: string) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'customer' || key === 'pickup' ? 'asc' : 'desc' },
    );
  }

  return (
    <Panel label="Loads">
      <PanelHeader title={title} count={rows.length} />
      <DataTable
        columns={COLUMNS}
        rows={sorted}
        rowKey={(load) => load.id}
        sort={sort}
        onSort={onSort}
      />
    </Panel>
  );
}
