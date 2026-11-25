'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { acceptInvitation } from '@/server/actions/team';

export function AcceptInvitation({ token }: { token: string }) {
  const router = useRouter();
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
    <div className="space-y-4">
      <FormError message={error} />
      <Button variant="primary" onClick={accept} disabled={busy} className="w-full">
        {busy ? 'Joining…' : 'Accept invitation'}
      </Button>
    </div>
  );
}
