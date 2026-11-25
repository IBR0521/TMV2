'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard, FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { useHydrated } from '@/ui/use-hydrated';
import { Field, TextInput } from '@/ui/field';
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
    <AuthCard
      title="Sign in"
      footer={
        <>
          New carrier?{' '}
          <Link href="/signup" className="text-link hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form method="post" onSubmit={signIn} className="space-y-4">
        <FormError message={error} />
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
        <Field label="Password">
          <TextInput
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Link href="/forgot-password" className="text-label text-link hover:underline">
            Forgot your password?
          </Link>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
