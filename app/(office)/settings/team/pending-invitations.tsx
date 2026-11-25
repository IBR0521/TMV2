'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/button';
import { PanelRow } from '@/ui/panel';
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
    <div data-testid="pending-invitations">
      {error && (
        <p role="alert" className="border-b border-border px-5 py-3 text-label text-warning">
          {error}
        </p>
      )}
      {invitations.map((invitation) => (
        <PanelRow key={invitation.id}>
          <div className="min-w-0">
            <p className="truncate text-body-strong">{invitation.email}</p>
            <p className="truncate text-label text-text-muted">
              {roleLabel(invitation.role)} · link expires{' '}
              {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
            {/* The link is shown, not just copied: you can see what you are sending. */}
            <code
              data-testid="invite-link"
              className="mt-1 block truncate font-mono text-label text-text-secondary"
            >
              {invitation.link}
            </code>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="quiet" onClick={() => void copy(invitation)}>
              {copied === invitation.id ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="secondary"
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
          </div>
        </PanelRow>
      ))}
    </div>
  );
}
