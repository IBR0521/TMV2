'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard, FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { Field, TextInput } from '@/ui/field';
import { browserDb } from '@/server/db/browser';

/**
 * Step one of signup: the account. Step two (the carrier itself) is
 * /onboarding, which calls the one database function allowed to create a
 * company for the signed-in account.
 */
export default function SignupPage() {
  const router = useRouter();
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

    // Email confirmation is off locally and on in production.
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
      <AuthCard title="Check your email" subline={`We sent a confirmation link to ${email}.`}>
        <p className="text-body text-text-secondary">
          Open it to finish creating your account, then set up your carrier.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subline="14 days free, no card."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-link hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={signUp} className="space-y-4">
        <FormError message={error} />
        <Field label="Your name">
          <TextInput
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <TextInput
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
