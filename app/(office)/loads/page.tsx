import { Button, Notice, PageHeader, SearchField, Tabs } from '@/ui';
import { requireSection } from '@/server/guard';
import { SAMPLE_LOADS, type SampleLoad } from './_sample';
import { LoadsList } from './loads-list';

export const metadata = { title: 'Loads' };

/**
 * Every load with status, driver, rate and margin (docs/spec/screens.md, row 2).
 *
 * Phase 1 has no loads table, so the rows are the spec's sample figures and the
 * notice says so. Phase 3 replaces SAMPLE_LOADS with a query; the assembly does
 * not change.
 *
 * Saved views are links rather than client state, so a view can be shared and
 * the back button works.
 */
const VIEWS = [
  { key: 'all', label: 'All', matches: () => true },
  {
    key: 'driver',
    label: 'Needs a driver',
    matches: (load: SampleLoad) => load.driver === null && load.status !== 'draft',
  },
  {
    key: 'transit',
    label: 'On the road',
    matches: (load: SampleLoad) => load.status === 'in_transit' || load.status === 'dispatched',
  },
  {
    key: 'billing',
    label: 'Ready to bill',
    matches: (load: SampleLoad) => load.status === 'delivered' && load.billed === 'ready',
  },
];

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireSection('loads');

  const { view } = await searchParams;
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0]!;
  const rows = SAMPLE_LOADS.filter((load) => active.matches(load));

  return (
    <>
      <PageHeader title="Loads" subtitle={`${SAMPLE_LOADS.length} loads`}>
        <SearchField />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <Notice label="Sample">
        These rows come from the spec, not the database. Loads is built in phase 3.
      </Notice>

      <Tabs
        items={VIEWS.map((v) => ({
          label: v.label,
          href: v.key === 'all' ? '/loads' : `/loads?view=${v.key}`,
          active: v.key === active.key,
          count: SAMPLE_LOADS.filter((load) => v.matches(load)).length,
        }))}
      />

      <LoadsList rows={rows} title={active.label} />
    </>
  );
}
