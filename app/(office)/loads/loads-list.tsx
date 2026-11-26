'use client';

import { useMemo, useState } from 'react';
import {
  Amount,
  Button,
  type Column,
  DataTable,
  Panel,
  PanelHeader,
  SelectionBar,
  type Sort,
  StatusChip,
  TextLink,
} from '@/ui';
import { STATUS_LABEL, type SampleLoad } from './_sample';

/**
 * The loads list: sorting and selection live here, the markup is the kit's.
 * Saved views are links on the page, so a view can be shared and the back
 * button works; only sorting and selection need state.
 */
const COLUMNS: Column<SampleLoad>[] = [
  {
    key: 'number',
    header: 'Load',
    render: (load) => <TextLink href={`/loads/${load.number}`}>#{load.number}</TextLink>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (load) =>
      load.late ? (
        <StatusChip tone="warning" dot>
          Late
        </StatusChip>
      ) : (
        <StatusChip tone={load.status === 'delivered' ? 'idle' : 'normal'}>
          {STATUS_LABEL[load.status]}
        </StatusChip>
      ),
  },
  { key: 'customer', header: 'Customer', sortable: true, render: (load) => load.customer },
  { key: 'lane', header: 'Lane', render: (load) => `${load.from} → ${load.to}` },
  { key: 'pickup', header: 'Pickup', sortable: true, render: (load) => load.pickup },
  {
    key: 'driver',
    header: 'Driver',
    render: (load) =>
      load.driver ? `${load.unit} · ${load.driver}` : <span className="text-text-muted">Unassigned</span>,
  },
  { key: 'miles', header: 'Miles', align: 'right', sortable: true, render: (load) => load.miles },
  {
    key: 'rate',
    header: 'Rate',
    align: 'right',
    sortable: true,
    render: (load) => <Amount cents={load.rateCents} decimals={false} />,
  },
];

export function LoadsList({ rows, title }: { rows: SampleLoad[]; title: string }) {
  const [sort, setSort] = useState<Sort>({ key: 'pickup', direction: 'asc' });
  const [selected, setSelected] = useState<string[]>([]);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case 'customer':
          return a.customer.localeCompare(b.customer) * factor;
        case 'miles':
          return (a.miles - b.miles) * factor;
        case 'rate':
          return (a.rateCents - b.rateCents) * factor;
        default:
          return a.pickup.localeCompare(b.pickup) * factor;
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

      <SelectionBar count={selected.length}>
        <Button size="sm" onClick={() => setSelected([])}>
          Clear
        </Button>
        <Button size="sm">Assign driver</Button>
        <Button size="sm" variant="primary">
          Create invoices
        </Button>
      </SelectionBar>

      <DataTable
        columns={COLUMNS}
        rows={sorted}
        rowKey={(load) => load.id}
        sort={sort}
        onSort={onSort}
        selected={selected}
        onSelect={(key) =>
          setSelected((current) =>
            current.includes(key) ? current.filter((id) => id !== key) : [...current, key],
          )
        }
        onSelectAll={() =>
          setSelected((current) =>
            current.length === sorted.length ? [] : sorted.map((load) => load.id),
          )
        }
      />
    </Panel>
  );
}
