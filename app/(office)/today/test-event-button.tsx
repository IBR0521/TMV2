'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { useHydrated } from '@/ui/use-hydrated';
import { sendTestPing } from '@/server/actions/automation';

/**
 * Phase 1 only. One click writes an automation_test_pings row, which fires the
 * trigger that records the event and queues the worker job in the same
 * transaction; the card it produces should appear below without a refresh.
 */
export function TestEventButton() {
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        data-testid="send-test-event"
        disabled={pending || !ready}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await sendTestPing({ note: 'Sent from Today' });
            if (!result.ok) setError(result.error);
          })
        }
      >
        {pending ? 'Sending…' : 'Send test event'}
      </Button>
      {error && (
        <span role="alert" className="text-label text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
