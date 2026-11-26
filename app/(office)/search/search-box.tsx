'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Panel } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';

/**
 * The search box, built from the kit's own Input rather than its SearchField:
 * SearchField takes no name and no handler, so it cannot be submitted. One
 * prop in src/ui would fix that, and src/ui is the owner's.
 *
 * It navigates rather than fetching, so a search is a URL: shareable, and the
 * back button works.
 */
export function SearchBox({ term }: { term: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [value, setValue] = useState(term);

  function run(event: React.FormEvent) {
    event.preventDefault();
    const typed = value.trim();
    router.push(typed === '' ? '/search' : `/search?q=${encodeURIComponent(typed)}`);
  }

  return (
    <Panel label="Search">
      <form method="get" action="/search" onSubmit={run}>
        <FormGrid columns={1}>
          <Field label="What are you looking for?">
            <Input
              name="q"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Luis Ortega, 117, TX 4R18117, Northline"
              aria-label="Search for a driver, unit, customer or facility"
            />
          </Field>
        </FormGrid>
        <FormActions>
          <Button type="submit" variant="primary" disabled={!ready}>
            Search
          </Button>
        </FormActions>
      </form>
    </Panel>
  );
}
