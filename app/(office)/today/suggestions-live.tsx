'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { browserDb } from '@/server/db/browser';

/**
 * Keeps Today live. It follows this company's suggestions over Supabase
 * Realtime and re-renders the page when one arrives or is resolved, so a card
 * the worker writes shows up without a refresh.
 *
 * RLS applies to a subscription exactly as it does to a query: another
 * carrier's rows are never sent to this browser.
 */
export function SuggestionsLive({ companyId }: { companyId: string }) {
  const router = useRouter();

  useEffect(() => {
    const db = browserDb();
    const channel = db
      .channel(`suggestions:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `company_id=eq.${companyId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  }, [companyId, router]);

  return null;
}
