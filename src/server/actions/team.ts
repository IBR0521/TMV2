'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { action, sessionAction } from '../action';
import * as team from '../services/team';

const invited = z.object({
  email: z.email('Enter a valid email address.').max(254),
  // An owner is not invited: the account that signs up is the owner.
  role: z.enum(['dispatcher', 'accounting', 'driver']),
});

export const inviteMember = action(invited, ['owner'], async (ctx, input) => {
  const invitation = await team.invite(ctx, input, new Date());
  revalidatePath('/settings/team');
  return invitation;
});

export const revokeInvitation = action(
  z.object({ invitationId: z.uuid() }),
  ['owner'],
  async (ctx, input) => {
    await team.revokeInvitation(ctx, input.invitationId);
    revalidatePath('/settings/team');
    return { revoked: true };
  },
);

export const acceptInvitation = sessionAction(
  z.object({ token: z.string().min(32).max(200) }),
  async (session, input) => {
    const companyId = await team.acceptInvitation(session, input.token);
    revalidatePath('/', 'layout');
    return { companyId };
  },
);
