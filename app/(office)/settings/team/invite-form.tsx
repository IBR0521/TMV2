'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { inviteMember } from '@/server/actions/team';

/** The one primary button on this screen: Invite. */
export function InviteForm() {
  const router = useRouter();
  const ready = useHydrated();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'dispatcher' | 'accounting' | 'driver'>('dispatcher');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
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
    <>
      <FormGrid>
        <Field label="Email" error={error ?? undefined}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@carrier.com"
            aria-label="Email to invite"
          />
        </Field>
        <Field label="Role">
          <Select
            value={role}
            aria-label="Role"
            onChange={(event) => setRole(event.target.value as typeof role)}
          >
            <option value="dispatcher">Dispatcher</option>
            <option value="accounting">Accounting</option>
            <option value="driver">Driver</option>
          </Select>
        </Field>
      </FormGrid>

      <FormActions>
        <Button variant="primary" disabled={pending || !ready} onClick={invite}>
          {pending ? 'Inviting' : 'Invite'}
        </Button>
      </FormActions>
    </>
  );
}
