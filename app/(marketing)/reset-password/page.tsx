'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Panel, PanelHeader } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { browserDb } from '@/server/db/browser';

/**
 * Opened from the email link, which puts a recovery session in place before
 * this page loads.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const ready = useHydrated();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: authError } = await browserDb().auth.updateUser({ password });
    setBusy(false);

    if (authError) {
      setError('That password could not be saved. Open the link from your email again.');
      return;
    }

    router.replace('/today');
    router.refresh();
  }

  return (
    <form method="post" onSubmit={save}>
      <Panel>
        <PanelHeader title="Choose a new password" />
        <FormGrid columns={1}>
          <Field label="New password" hint="At least 8 characters." error={error ?? undefined}>
            <Input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </FormGrid>
        <FormActions>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Saving' : 'Save password'}
          </Button>
        </FormActions>
      </Panel>
    </form>
  );
}
