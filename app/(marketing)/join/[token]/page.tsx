import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/ui/auth-card';
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
      <AuthCard
        title="You have been invited"
        subline="Sign in with the email address the invitation was sent to."
      >
        <div className="flex flex-col gap-2">
          <Link
            href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}
            className="text-body text-link hover:underline"
          >
            Create an account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
            className="text-body text-link hover:underline"
          >
            Sign in to an existing account
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (!token || token.length < 32) redirect('/');

  return (
    <AuthCard title="Join this carrier" subline={`Signed in as ${session.email}.`}>
      <AcceptInvitation token={token} />
    </AuthCard>
  );
}
