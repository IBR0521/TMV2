import {
  Amount,
  Button,
  type Column,
  DataTable,
  PageHeader,
  Panel,
  PanelHeader,
  SearchField,
  StatusChip,
  TextLink,
} from '@/ui';
import { requireSection } from '@/server/guard';
import { SAMPLE_LOADS, STATUS_LABEL, type SampleLoad } from './_sample';

export const metadata = { title: 'Loads' };

/**
 * Every load with status, driver, rate and margin (docs/spec/screens.md, row 2).
 *
 * Phase 1 has no loads table, so these are the spec's sample figures and the
 * subtitle says so. Phase 3 replaces SAMPLE_LOADS with a query.
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
  { key: 'customer', header: 'Customer', render: (load) => load.customer },
  { key: 'lane', header: 'Lane', render: (load) => `${load.from} → ${load.to}` },
  { key: 'pickup', header: 'Pickup', render: (load) => load.pickup },
  {
    key: 'driver',
    header: 'Driver',
    render: (load) =>
      load.driver ? `${load.unit} · ${load.driver}` : <span className="text-text-muted">Unassigned</span>,
  },
  { key: 'miles', header: 'Miles', align: 'right', render: (load) => load.miles },
  {
    key: 'rate',
    header: 'Rate',
    align: 'right',
    render: (load) => <Amount cents={load.rateCents} decimals={false} />,
  },
];

export default async function LoadsPage() {
  await requireSection('loads');

  return (
    <>
      <PageHeader
        title="Loads"
        subtitle={`${SAMPLE_LOADS.length} loads · sample data until phase 3`}
      >
        <SearchField />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <Panel label="Loads">
        <PanelHeader title="All loads" count={SAMPLE_LOADS.length} />
        <DataTable columns={COLUMNS} rows={SAMPLE_LOADS} rowKey={(load) => load.id} />
      </Panel>
    </>
  );
}
