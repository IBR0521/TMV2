/**
 * Whether an invitation can still be used. The token itself is made by the
 * server (randomness is not pure); this only judges an invitation's state.
 *
 * Pure: no database, no network, no clock.
 */
export const INVITATION_DAYS = 7;

export type InvitationState = {
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: Date | string;
};

export function invitationExpiresAt(createdAt: Date, days: number = INVITATION_DAYS): Date {
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isInvitationUsable(invitation: InvitationState, now: Date): boolean {
  if (invitation.status !== 'pending') return false;
  const expires =
    typeof invitation.expiresAt === 'string' ? new Date(invitation.expiresAt) : invitation.expiresAt;
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() > now.getTime();
}

/** Why an invitation cannot be used, in words a person can act on. */
export function invitationProblem(invitation: InvitationState, now: Date): string | null {
  if (invitation.status === 'accepted') return 'This invitation has already been used.';
  if (invitation.status === 'revoked') return 'This invitation was withdrawn.';
  if (!isInvitationUsable(invitation, now)) return 'This invitation has expired.';
  return null;
}
