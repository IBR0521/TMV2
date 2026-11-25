import { PageHeader } from '@/ui/page-header';
import { Panel, PanelHeader, PanelRow } from '@/ui/panel';
import { EmptyState } from '@/ui/empty-state';
import { roleLabel } from '@/domain/roles';
import { requireRole } from '@/server/guard';
import { listInvitations, listTeam } from '@/server/services/team';
import { InviteForm } from './invite-form';
import { PendingInvitations } from './pending-invitations';

export const metadata = { title: 'Users and roles' };

/**
 * Invite by email with a role, and a copyable link for everyone — drivers
 * included, since nothing here sends an SMS (CLAUDE.md, rule 5). Email
 * delivery arrives with Resend in phase 5; until then the link is the invite.
 */
export default async function TeamPage() {
  const ctx = await requireRole('settings', ['owner']);
  const [members, invitations] = await Promise.all([listTeam(ctx), listInvitations(ctx)]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users and roles"
        subline={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
        action={<InviteForm />}
      />

      <Panel>
        <PanelHeader title="People" count={members.length} />
        {members.map((member) => (
          <PanelRow key={member.membershipId}>
            <div className="min-w-0">
              <p className="truncate text-body-strong">{member.name || member.email}</p>
              <p className="truncate text-label text-text-muted">{member.email}</p>
            </div>
            <div className="text-right">
              <p className="text-body">{roleLabel(member.role)}</p>
              {member.status !== 'active' && (
                <p className="text-label text-warning">{member.status}</p>
              )}
            </div>
          </PanelRow>
        ))}
      </Panel>

      <Panel>
        <PanelHeader title="Invited" count={invitations.length} />
        {invitations.length === 0 ? (
          <EmptyState title="No open invitations" detail="Invite someone and copy their link." />
        ) : (
          <PendingInvitations invitations={invitations} />
        )}
      </Panel>
    </div>
  );
}
