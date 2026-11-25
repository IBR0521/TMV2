'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard, FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { useHydrated } from '@/ui/use-hydrated';
import { Field, TextInput } from '@/ui/field';
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
      <AuthCard title="Check your email" subline={`If ${email} has an account, a reset link is on its way.`}>
        <Link href="/login" className="text-label text-link hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subline="We will email you a link.">
      <form method="post" onSubmit={send} className="space-y-4">
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
        <Button type="submit" variant="primary" disabled={busy || !ready} className="w-full">
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  );
}
