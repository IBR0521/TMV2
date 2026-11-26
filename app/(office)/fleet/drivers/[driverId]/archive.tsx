'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { archiveDriver } from '@/server/actions/fleet';

/**
 * Archiving, not deleting (CLAUDE.md rule 2): the driver leaves the lists and
 * stays on every load and settlement they ever ran.
 *
 * It asks first, in words, and says what archiving means — the button is next
 * to a form people are editing.
 */
export function ArchiveDriver({ driverId, name }: { driverId: string; name: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);

  function archive() {
    startTransition(async () => {
      const result = await archiveDriver({ driverId });
      if (result.ok) router.push('/fleet');
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
        {pending ? 'Archiving' : 'Archive, keeping their history'}
      </Button>
    </>
  );
}
