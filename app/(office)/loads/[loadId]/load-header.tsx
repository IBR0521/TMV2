'use client';

import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, PageHeader } from '@/ui';
import type { LoadStatus } from '@/domain/load';
import { useHydrated } from '@/client/use-hydrated';
import { moveLoad } from '@/server/actions/loads';

/**
 * The load's header, and the one primary button on the screen: the next thing
 * that happens to this load (design/KIT.md — one primary button per screen,
 * the next step for the record on screen).
 *
 * The header and the refusal are one component because they share one piece
 * of state. Every refusal comes from src/domain/load.ts as a sentence a
 * dispatcher can act on — "A load needs a delivery before it can be booked" —
 * so it is shown as it arrived rather than softened into something vaguer.
 */
export function LoadHeader({
  loadId,
  title,
  subtitle,
  status,
  next,
}: {
  loadId: string;
  title: string;
  subtitle: string;
  status: ReactNode;
  next: { to: LoadStatus; label: string } | null;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();
  const [problem, setProblem] = useState<string | null>(null);

  function go(to: LoadStatus) {
    setProblem(null);
    startTransition(async () => {
      const result = await moveLoad({ loadId, to });
      if (!result.ok) {
        setProblem(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} status={status}>
        <Button href={`/loads/${loadId}/edit`}>Edit</Button>
        {next === null ? null : (
          <Button variant="primary" disabled={pending || !ready} onClick={() => go(next.to)}>
            {pending ? 'Saving' : next.label}
          </Button>
        )}
      </PageHeader>

      {problem === null ? null : (
        <Notice tone="warning" label="Not yet">
          {problem}
        </Notice>
      )}
    </>
  );
}
