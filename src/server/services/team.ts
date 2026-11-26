import { randomBytes } from 'node:crypto';
import { appUrl } from '@/env';
import { INVITATION_DAYS, invitationExpiresAt } from '@/domain/invitations';
import { canInviteRole, type Role } from '@/domain/roles';
import type { Ctx, Session } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

/**
 * The team: who is in this company, and who has been invited.
 *
 * Invitations are links, not messages. Phase 1 shows the link to copy for
 * every role; Resend sends it by email from phase 5, and nothing here will
 * ever send an SMS (CLAUDE.md, rule 5).
 */
export type TeamMember = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited' | 'disabled';
  joinedAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  link: string;
};

function inviteLink(token: string): string {
  return `${appUrl()}/join/${token}`;
}

export async function listTeam(ctx: Ctx): Promise<TeamMember[]> {
  const { data, error } = await ctx.db
    .from('memberships')
    .select('id, user_id, role, status, created_at, users!inner(name, email)')
    .eq('company_id', ctx.companyId)
    .order('created_at', { ascending: true });

  if (error) fail(error, 'The team could not be read.');

  return data.map((row) => ({
    membershipId: row.id,
    userId: row.user_id,
    name: row.users.name,
    email: row.users.email,
    role: row.role,
    status: row.status,
    joinedAt: row.created_at,
  }));
}

export async function listInvitations(ctx: Ctx): Promise<Invitation[]> {
  const { data, error } = await ctx.db
    .from('invitations')
    .select('id, email, role, token, expires_at')
    .eq('company_id', ctx.companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) fail(error, 'The invitations could not be read.');

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
    link: inviteLink(row.token),
  }));
}

export async function invite(
  ctx: Ctx,
  input: { email: string; role: Role },
  now: Date,
): Promise<Invitation> {
  if (!canInviteRole(ctx.role, input.role)) {
    throw new ActionError('Only the owner can invite people.');
  }

  const email = input.email.trim().toLowerCase();

  const alreadyHere = await ctx.db
    .from('memberships')
    .select('id, users!inner(email)')
    .eq('company_id', ctx.companyId)
    .eq('users.email', email)
    .maybeSingle();

  if (alreadyHere.data) {
    throw new ActionError(`${email} is already on the team.`);
  }

  // 43 url-safe characters: the whole link is the secret.
  const token = randomBytes(32).toString('base64url');
  const expiresAt = invitationExpiresAt(now, INVITATION_DAYS);

  const { data, error } = await ctx.db
    .from('invitations')
    .insert({
      company_id: ctx.companyId,
      email,
      role: input.role,
      token,
      expires_at: expiresAt.toISOString(),
      invited_by: ctx.userId,
    })
    .select('id, email, role, token, expires_at')
    .single();

  if (error) fail(error, `${email} has already been invited.`);

  await audit.record(ctx, {
    action: 'invitation.created',
    subjectType: 'invitation',
    subjectId: data.id,
    after: { email, role: input.role },
  });

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    expiresAt: data.expires_at,
    link: inviteLink(data.token),
  };
}

export async function revokeInvitation(ctx: Ctx, invitationId: string): Promise<void> {
  if (!canInviteRole(ctx.role, 'dispatcher')) {
    throw new ActionError('Only the owner can withdraw an invitation.');
  }

  const { data, error } = await ctx.db
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('company_id', ctx.companyId)
    .eq('id', invitationId)
    .eq('status', 'pending')
    .select('id, email')
    .maybeSingle();

  if (error) fail(error, 'That invitation could not be withdrawn.');
  if (!data) throw new ActionError('That invitation is no longer open.');

  await audit.record(ctx, {
    action: 'invitation.revoked',
    subjectType: 'invitation',
    subjectId: data.id,
    before: { email: data.email, status: 'pending' },
    after: { status: 'revoked' },
  });
}

/**
 * Accepting an invitation. Like signup, the account is not a member yet, so
 * this goes through a database function; it checks the token, the expiry and
 * that the invitation was addressed to this account's email.
 */
export async function acceptInvitation(session: Session, token: string): Promise<string> {
  const { data, error } = await session.db.rpc('tm_accept_invitation', { p_token: token });

  if (error) fail(error, 'This invitation has expired or was already used.');
  return data as string;
}
