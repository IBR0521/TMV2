'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/button';
import { useHydrated } from '@/ui/use-hydrated';
import { Select, TextInput } from '@/ui/field';
import { inviteMember } from '@/server/actions/team';

/** The one primary button on this screen: Invite. */
export function InviteForm() {
  const router = useRouter();
  const ready = useHydrated();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'dispatcher' | 'accounting' | 'driver'>('dispatcher');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteMember({ email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail('');
      router.refresh();
    });
  }

  return (
    <form method="post" onSubmit={invite} className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
        <TextInput
          type="email"
          name="email"
          required
          aria-label="Email to invite"
          placeholder="name@carrier.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select
          name="role"
          aria-label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          <option value="dispatcher">Dispatcher</option>
          <option value="accounting">Accounting</option>
          <option value="driver">Driver</option>
        </Select>
        <Button type="submit" variant="primary" disabled={pending || !ready}>
          {pending ? 'Inviting…' : 'Invite'}
        </Button>
      </div>
      {error && (
        <span role="alert" className="text-label text-danger">
          {error}
        </span>
      )}
    </form>
  );
}
