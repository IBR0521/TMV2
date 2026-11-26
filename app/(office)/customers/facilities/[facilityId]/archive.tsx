'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { archiveFacility } from '@/server/actions/facilities';

/**
 * Archiving, not deleting (CLAUDE.md rule 2): a facility stays on every load
 * that ever stopped there, including the detention it caused.
 */
export function ArchiveFacility({ facilityId, name }: { facilityId: string; name: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);

  function archive() {
    startTransition(async () => {
      const result = await archiveFacility({ facilityId });
      if (result.ok) router.push('/customers/facilities');
    });
  }

  if (!asking) {
    return (
      <Button disabled={!ready} onClick={() => setAsking(true)}>
        Archive
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setAsking(false)}>Keep {name}</Button>
      <Button disabled={pending} onClick={archive}>
        {pending ? 'Archiving' : 'Archive, keeping its history'}
      </Button>
    </>
  );
}
