import { Button, EmptyState, PageHeader, Panel, PanelHeader, SearchField, Tabs } from '@/ui';
import { requireSection } from '@/server/guard';
import { listLoads, type LoadRow } from '@/server/services/loads';
import { LoadsList } from './loads-list';

export const metadata = { title: 'Loads' };

/**
 * Every load with status, driver, rate and profit (docs/spec/screens.md, row 2).
 *
 * Saved views are links rather than client state, so a view can be shared and
 * the back button works.
 */
const VIEWS = [
  { key: 'all', label: 'All', matches: () => true },
  {
    key: 'driver',
    label: 'Needs a driver',
    matches: (load: LoadRow) =>
      load.driverId === null && (load.status === 'booked' || load.status === 'draft'),
  },
  {
    key: 'transit',
    label: 'On the road',
    matches: (load: LoadRow) => load.status === 'in_transit' || load.status === 'dispatched',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    matches: (load: LoadRow) => load.status === 'delivered',
  },
];

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const ctx = await requireSection('loads');
  const loads = await listLoads(ctx);

  const { view } = await searchParams;
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0]!;
  const rows = loads.filter((load) => active.matches(load));
  const empty = loads.length === 0;

  return (
    <>
      <PageHeader
        title="Loads"
        subtitle={`${loads.length} ${loads.length === 1 ? 'load' : 'loads'}`}
      >
        <SearchField action="/search" />
        {empty ? null : (
          <Button variant="primary" href="/loads/new">
            New load
          </Button>
        )}
      </PageHeader>

      {empty ? (
        <Panel label="Loads">
          <PanelHeader title="Loads" />
          <EmptyState
            title="No loads yet"
            hint="Start one by hand. From phase 3b you will be able to drop a rate con on any page instead."
            action={
              <Button variant="primary" href="/loads/new">
                New load
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <Tabs
            items={VIEWS.map((v) => ({
              label: v.label,
              href: v.key === 'all' ? '/loads' : `/loads?view=${v.key}`,
              active: v.key === active.key,
              count: loads.filter((load) => v.matches(load)).length,
            }))}
          />

          <LoadsList rows={rows} title={active.label} />
        </>
      )}
    </>
  );
}
