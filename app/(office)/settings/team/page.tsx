import {
  type Column,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  StatusChip,
} from '@/ui';
import { roleLabel } from '@/domain/roles';
import { requireRole } from '@/server/guard';
import { listInvitations, listTeam, type TeamMember } from '@/server/services/team';
import { InviteForm } from './invite-form';
import { PendingInvitations } from './pending-invitations';

export const metadata = { title: 'Users and roles' };

const COLUMNS: Column<TeamMember>[] = [
  { key: 'name', header: 'Name', render: (member) => member.name || member.email },
  { key: 'email', header: 'Email', render: (member) => member.email },
  { key: 'role', header: 'Role', render: (member) => roleLabel(member.role) },
  {
    key: 'status',
    header: 'Status',
    align: 'right',
    render: (member) =>
      member.status === 'active' ? (
        <StatusChip tone="idle">Active</StatusChip>
      ) : (
        <StatusChip tone="warning">{member.status}</StatusChip>
      ),
  },
];

/**
 * Invite by email with a role, and a copyable link for everyone — drivers
 * included, since nothing here sends an SMS (CLAUDE.md, rule 5). Email
 * delivery arrives with Resend in phase 5; until then the link is the invite.
 */
export default async function TeamPage() {
  const ctx = await requireRole('settings', ['owner']);
  const [members, invitations] = await Promise.all([listTeam(ctx), listInvitations(ctx)]);

  return (
    <>
      <PageHeader
        title="Users and roles"
        subtitle={`${members.length} ${members.length === 1 ? 'person' : 'people'}`}
      />

      <Panel label="Invite someone">
        <PanelHeader title="Invite someone" />
        <InviteForm />
      </Panel>

      <Panel label="People">
        <PanelHeader title="People" count={members.length} />
        <DataTable columns={COLUMNS} rows={members} rowKey={(member) => member.membershipId} />
      </Panel>

      <Panel label="Invited">
        <PanelHeader title="Invited" count={invitations.length} />
        {invitations.length === 0 ? (
          <EmptyState title="No open invitations" hint="Invite someone and copy their link." />
        ) : (
          <PendingInvitations invitations={invitations} />
        )}
      </Panel>
    </>
  );
}
