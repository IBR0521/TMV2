import { redirect } from 'next/navigation';
import { Button, FormActions, Panel, PanelHeader } from '@/ui';
import { getContext } from '@/server/context';
import { listInvitations } from '@/server/services/team';
import { InviteForm } from '../../../(office)/settings/team/invite-form';
import { PendingInvitations } from '../../../(office)/settings/team/pending-invitations';
import { Steps } from '../steps';

export const metadata = { title: 'Your team' };

/**
 * Step five of signup: "Invite dispatchers and accounting by email with a
 * role. Drivers get an invite link the owner can text from their own phone
 * (no SMS cost)."
 *
 * The same invite form Settings uses, and the same list of pending links.
 * Finishing here lands on Today, which keeps a checklist of anything skipped.
 */
export default async function SetupTeamPage() {
  const ctx = await getContext();
  if (ctx === null) redirect('/onboarding');

  const invitations = await listInvitations(ctx);

  return (
    <>
      <Steps
        current="team"
        title="Your team"
        subtitle="Invite dispatch and accounting, or go on alone and invite them later."
      />

      <Panel label="Invite someone">
        <PanelHeader title="Invite someone" />
        <InviteForm />
      </Panel>

      {invitations.length === 0 ? null : <PendingInvitations invitations={invitations} />}

      <Panel>
        <PanelHeader title="That is setup" />
        <FormActions>
          <Button variant="primary" href="/today">
            Go to Today
          </Button>
        </FormActions>
      </Panel>
    </>
  );
}
