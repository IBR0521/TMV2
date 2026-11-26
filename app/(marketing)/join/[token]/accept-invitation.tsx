'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, EmptyState } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { acceptInvitation } from '@/server/actions/team';

export function AcceptInvitation({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);

    const result = await acceptInvitation({ token });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    router.replace('/today');
    router.refresh();
  }

  return (
    <EmptyState
      title={error ?? `Signed in as ${email}`}
      hint={error ? undefined : 'Accepting adds you to the carrier that invited you.'}
      action={
        <Button variant="primary" disabled={busy || !ready} onClick={accept}>
          {busy ? 'Joining' : 'Accept invitation'}
        </Button>
      }
    />
  );
}
