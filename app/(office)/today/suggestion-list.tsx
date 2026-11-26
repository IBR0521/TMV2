'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { suggestionLabelFor } from '@/domain/automation';
import { Button } from '@/ui/button';
import { acceptSuggestion, dismissSuggestion } from '@/server/actions/suggestions';
import type { Suggestion } from '@/server/services/suggestions';

/**
 * The "Needs you" rows: a state dot, one line of facts, and the action on the
 * right. No dividers — a row separates by lifting under the pointer.
 *
 * Only the first Accept is the primary button: it is the next step on this
 * screen, and a second saturated button would be a lie about what matters.
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
        <p role="alert" className="mb-2 rounded-md bg-danger-fill px-3 py-2 text-label text-danger">
          {error}
        </p>
      )}

      <ul data-testid="suggestions">
        {rows.map((row, index) => (
          <li
            key={row.id}
            data-testid="suggestion"
            className="row flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-3"
          >
            <span
              aria-hidden
              className="mt-[7px] h-1.5 w-1.5 shrink-0 self-start rounded-full bg-primary"
            />

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-body">{row.title}</span>
                <span className="hidden shrink-0 text-label text-text-faint lg:block">
                  {suggestionLabelFor(row.type)}
                </span>
              </span>
              {row.detail && (
                <span className="mt-0.5 block truncate text-label text-text-muted">
                  {row.detail}
                </span>
              )}
            </span>

            <span className="flex shrink-0 items-center gap-1">
              <Button
                variant="quiet"
                className="h-8 px-3"
                disabled={pending}
                onClick={() => run(() => dismissSuggestion({ suggestionId: row.id }))}
              >
                Dismiss
              </Button>
              {row.actionName && (
                <Button
                  variant={index === 0 ? 'primary' : 'quiet'}
                  className="h-8 px-3"
                  disabled={pending}
                  onClick={() => run(() => acceptSuggestion({ suggestionId: row.id }))}
                >
                  Accept
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
