'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { archiveCustomer } from '@/server/actions/customers';

/**
 * Archiving, not deleting (CLAUDE.md rule 2): the customer leaves the lists
 * and stays on every load and invoice they ever paid for.
 */
export function ArchiveCustomer({ customerId, name }: { customerId: string; name: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);

  function archive() {
    startTransition(async () => {
      const result = await archiveCustomer({ customerId });
      if (result.ok) router.push('/customers');
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
