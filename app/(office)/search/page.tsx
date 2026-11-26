import { redirect } from 'next/navigation';
import { Button, EmptyState, ListRow, PageHeader, Panel, PanelHeader, TextLink } from '@/ui';
import { getContext } from '@/server/context';
import { search, type SearchHit } from '@/server/services/search';
import { SearchBox } from './search-box';

export const metadata = { title: 'Search' };

/**
 * What a carrier is looking for: a driver, a unit, a customer or a dock.
 *
 * A page rather than a dropdown, because a page can be shared, bookmarked and
 * reached with the back button — and because the design kit's SearchField in
 * the header is decorative: it takes no name and no handler, so it cannot be
 * submitted. Wiring it up means one prop in src/ui, which is the owner's to
 * add (CLAUDE.md rule 7). Until then the search box lives here.
 */
const KIND_LABEL: Record<SearchHit['kind'], string> = {
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
            ? 'Drivers, trucks, trailers, customers and facilities.'
            : `${results.hits.length} ${results.hits.length === 1 ? 'result' : 'results'} for “${results.term}”`
        }
      />

      <SearchBox term={results.term} />

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
