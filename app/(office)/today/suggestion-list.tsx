'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { suggestionLabelFor } from '@/domain/automation';
import { Button } from '@/ui/button';
import { acceptSuggestion, dismissSuggestion } from '@/server/actions/suggestions';
import type { Suggestion } from '@/server/services/suggestions';

/**
 * The "Needs you" rows: a small grey label, one line of facts, and buttons on
 * the right. Only the first row's Accept is primary — it is the next step on
 * this screen (design/README.md, principle 1).
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
    <div>
      {error && (
        <p role="alert" className="border-b border-border px-5 py-3 text-label text-warning">
          {error}
        </p>
      )}
      <ul data-testid="suggestions">
        {rows.map((row, index) => (
          <li
            key={row.id}
            data-testid="suggestion"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-label text-text-muted">{suggestionLabelFor(row.type)}</p>
              <p className="truncate text-body-strong">{row.title}</p>
              {row.detail && <p className="truncate text-label text-text-muted">{row.detail}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="quiet"
                disabled={pending}
                onClick={() => run(() => dismissSuggestion({ suggestionId: row.id }))}
              >
                Dismiss
              </Button>
              {row.actionName && (
                <Button
                  variant={index === 0 ? 'primary' : 'secondary'}
                  disabled={pending}
                  onClick={() => run(() => acceptSuggestion({ suggestionId: row.id }))}
                >
                  Accept
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
