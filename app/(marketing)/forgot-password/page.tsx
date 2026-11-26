'use client';

import { useState } from 'react';
import {
  Button,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  Panel,
  PanelHeader,
  TextLink,
} from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { browserDb } from '@/server/db/browser';

export default function ForgotPasswordPage() {
  const ready = useHydrated();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: authError } = await browserDb().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setBusy(false);
    if (authError) {
      setError('That link could not be sent. Try again in a minute.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Panel>
        <PanelHeader title="Check your email" />
        <EmptyState
          title={`If ${email} has an account, a reset link is on its way`}
          action={<Button href="/login">Back to sign in</Button>}
        />
      </Panel>
    );
  }

  return (
    <form method="post" onSubmit={send}>
      <Panel>
        <PanelHeader title="Reset your password" />
        <FormGrid columns={1}>
          <Field label="Email" hint="We will email you a link." error={error ?? undefined}>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
        </FormGrid>
        <FormActions>
          <TextLink href="/login">Back to sign in</TextLink>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Sending' : 'Send reset link'}
          </Button>
        </FormActions>
      </Panel>
    </form>
  );
}
