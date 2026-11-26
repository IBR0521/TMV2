'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { sendTestPing } from '@/server/actions/automation';

/**
 * Phase 1 only. One click writes an automation_test_pings row, which fires the
 * trigger that records the event and queues the worker job in the same
 * transaction; the card it produces appears below without a refresh.
 */
export function TestEventButton() {
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="primary"
        disabled={pending || !ready}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await sendTestPing({ note: 'Sent from Today' });
            if (!result.ok) setError(result.error);
          })
        }
      >
        {pending ? 'Sending' : 'Send test event'}
      </Button>
      {error ? <span className="text-13 text-warning">{error}</span> : null}
    </>
  );
}
