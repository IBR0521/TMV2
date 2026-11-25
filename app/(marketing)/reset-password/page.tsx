'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard, FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { Field, TextInput } from '@/ui/field';
import { browserDb } from '@/server/db/browser';

/**
 * Opened from the email link, which puts a recovery session in place before
 * this page loads.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
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
    <AuthCard title="Choose a new password">
      <form onSubmit={save} className="space-y-4">
        <FormError message={error} />
        <Field label="New password" hint="At least 8 characters.">
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
          {busy ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </AuthCard>
  );
}
