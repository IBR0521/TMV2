'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { suggestionLabelFor } from '@/domain/automation';
import { Button, ListRow } from '@/ui';
import { acceptSuggestion, dismissSuggestion } from '@/server/actions/suggestions';
import type { Suggestion } from '@/server/services/suggestions';

/**
 * The "Needs you" rows. Only the first row's button is primary: it is the next
 * step on this screen.
 */
export function SuggestionList({ rows }: { rows: Suggestion[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? 'That did not work.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {error ? <ListRow label="Problem" title={error} /> : null}

      {rows.map((row, index) => (
        <ListRow
          key={row.id}
          label={suggestionLabelFor(row.type)}
          title={row.detail ? `${row.title} · ${row.detail}` : row.title}
          action={
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => dismissSuggestion({ suggestionId: row.id }))}
              >
                Dismiss
              </Button>
              {row.actionName ? (
                <Button
                  size="sm"
                  variant={index === 0 ? 'primary' : 'secondary'}
                  disabled={pending}
                  onClick={() => run(() => acceptSuggestion({ suggestionId: row.id }))}
                >
                  Accept
                </Button>
              ) : null}
            </>
          }
        />
      ))}
    </>
  );
}
