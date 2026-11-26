'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

/**
 * Step one of signup: the account. Step two (the carrier itself) is
 * /onboarding, which calls the one database function allowed to create a
 * company for the signed-in account.
 */
export default function SignupPage() {
  const router = useRouter();
  const ready = useHydrated();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { data, error: authError } = await browserDb().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (authError) {
      setBusy(false);
      setError(
        authError.message.toLowerCase().includes('already')
          ? 'That email already has an account. Sign in instead.'
          : 'That account could not be created. Check the email and password.',
      );
      return;
    }

    if (!data.session) {
      setBusy(false);
      setCheckEmail(true);
      return;
    }

    router.replace('/onboarding');
    router.refresh();
  }

  if (checkEmail) {
    return (
      <Panel>
        <PanelHeader title="Check your email" />
        <EmptyState
          title={`We sent a confirmation link to ${email}`}
          hint="Open it to finish creating your account, then set up your carrier."
        />
      </Panel>
    );
  }

  return (
    <form method="post" onSubmit={signUp}>
      <Panel>
        <PanelHeader title="Create your account" />
        <FormGrid columns={1}>
          <Field label="Your name">
            <Input
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Email" error={error ?? undefined}>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" hint="At least 8 characters. 14 days free, no card.">
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
          <TextLink href="/login">Sign in instead</TextLink>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Creating' : 'Create account'}
          </Button>
        </FormActions>
      </Panel>
    </form>
  );
}
