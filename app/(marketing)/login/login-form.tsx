'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Panel, PanelHeader, TextLink } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { browserDb } from '@/server/db/browser';

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const ready = useHydrated();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: authError } = await browserDb().auth.signInWithPassword({ email, password });
    if (authError) {
      setBusy(false);
      setError('That email and password do not match an account.');
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form method="post" onSubmit={signIn}>
      <Panel>
        <PanelHeader title="Sign in" />
        <FormGrid columns={1}>
          <Field label="Email" error={error ?? undefined}>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </FormGrid>
        <FormActions>
          <TextLink href="/forgot-password">Forgot your password?</TextLink>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Signing in' : 'Sign in'}
          </Button>
        </FormActions>
      </Panel>
    </form>
  );
}
