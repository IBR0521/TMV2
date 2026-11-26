'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ListRow } from '@/ui';
import { roleLabel } from '@/domain/roles';
import { revokeInvitation } from '@/server/actions/team';
import type { Invitation } from '@/server/services/team';

/** The link is the invitation: copy it into an email, a chat, anywhere. */
export function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy(invitation: Invitation) {
    try {
      await navigator.clipboard.writeText(invitation.link);
      setCopied(invitation.id);
    } catch {
      setError('Copying failed. Select the link and copy it by hand.');
    }
  }

  return (
    <>
      {error ? <ListRow label="Problem" title={error} /> : null}

      {invitations.map((invitation) => (
        <ListRow
          key={invitation.id}
          label={`${roleLabel(invitation.role)} · link expires ${new Date(
            invitation.expiresAt,
          ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          title={`${invitation.email} · ${invitation.link}`}
          action={
            <>
              <Button size="sm" variant="ghost" onClick={() => void copy(invitation)}>
                {copied === invitation.id ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await revokeInvitation({ invitationId: invitation.id });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    router.refresh();
                  })
                }
              >
                Withdraw
              </Button>
            </>
          }
        />
      ))}
    </>
  );
}
