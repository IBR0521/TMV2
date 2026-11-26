import { redirect } from 'next/navigation';
import { Button, EmptyState, Panel, PanelHeader } from '@/ui';
import { getSession } from '@/server/context';
import { AcceptInvitation } from './accept-invitation';

/**
 * The invite link. Who invited whom is not shown before the invitation is
 * accepted: an outsider holding a link has no right to read a carrier's
 * records, and RLS says so.
 */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getSession();

  if (!session) {
    return (
      <Panel>
        <PanelHeader title="You have been invited" />
        <EmptyState
          title="Sign in with the email address the invitation was sent to"
          hint="Create an account first if you do not have one."
          action={
            <>
              <Button href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}>Sign in</Button>
              <Button variant="primary" href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}>
                Create an account
              </Button>
            </>
          }
        />
      </Panel>
    );
  }

  if (!token || token.length < 32) redirect('/');

  return (
    <Panel>
      <PanelHeader title="Join this carrier" />
      <AcceptInvitation token={token} email={session.email} />
    </Panel>
  );
}
