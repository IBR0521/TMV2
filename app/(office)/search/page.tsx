import { redirect } from 'next/navigation';
import { Button, EmptyState, ListRow, PageHeader, Panel, PanelHeader, SearchField, TextLink } from '@/ui';
import { getContext } from '@/server/context';
import { search, type SearchHit } from '@/server/services/search';

export const metadata = { title: 'Search' };

/**
 * What a carrier is looking for: a driver, a unit, a customer or a dock.
 *
 * A page rather than a dropdown, because a page can be shared, bookmarked and
 * reached with the back button. The box in the header is the kit's own
 * SearchField, pointed here; this page shows the same field with what was
 * typed still in it, so the search can be corrected where the results are.
 */
const KIND_LABEL: Record<SearchHit['kind'], string> = {
  load: 'Load',
  driver: 'Driver',
  truck: 'Truck',
  trailer: 'Trailer',
  customer: 'Customer',
  facility: 'Facility',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getContext();
  if (ctx === null) redirect('/login');

  const { q } = await searchParams;
  const results = await search(ctx, q ?? '');

  return (
    <>
      <PageHeader
        title="Search"
        subtitle={
          results.term === ''
            ? 'Loads, drivers, trucks, trailers, customers and facilities.'
            : `${results.hits.length} ${results.hits.length === 1 ? 'result' : 'results'} for “${results.term}”`
        }
      >
        <SearchField action="/search" defaultValue={results.term} />
      </PageHeader>

      <Panel label="Results">
        <PanelHeader title="Results" count={results.hits.length} />

        {results.term.length < 2 ? (
          <EmptyState
            title="Type at least two letters"
            hint="A name, a unit number, a plate, a VIN or an MC number."
          />
        ) : results.hits.length === 0 ? (
          <EmptyState
            title={`Nothing matches “${results.term}”`}
            hint="Only this carrier's own records are searched."
          />
        ) : (
          results.hits.map((hit) => (
            <ListRow
              key={`${hit.kind}-${hit.id}`}
              label={KIND_LABEL[hit.kind]}
              title={
                <>
                  <TextLink href={hit.href}>{hit.title}</TextLink>
                  {hit.detail === '' ? null : ` · ${hit.detail}`}
                </>
              }
              action={
                <Button size="sm" href={hit.href}>
                  Open
                </Button>
              }
            />
          ))
        )}
      </Panel>
    </>
  );
}
