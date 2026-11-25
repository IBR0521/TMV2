import type { Ctx } from '../context';
import { fail } from '../db/errors';

/**
 * CLAUDE.md, rule 6: the subscriptions table is the only source of plan, truck
 * limit and AI quota, and it is read through here. The browser cannot write it
 * at all (the table grants select only); signup and, from phase 8, the Paddle
 * webhook are what set it.
 */
export type Entitlements = {
  plan: string;
  provider: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  truckLimit: number;
  aiQuota: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

export async function getEntitlements(ctx: Ctx): Promise<Entitlements> {
  const { data, error } = await ctx.db
    .from('subscriptions')
    .select('plan, provider, status, truck_limit, ai_quota, trial_ends_at, current_period_end')
    .eq('company_id', ctx.companyId)
    .single();

  if (error) fail(error, 'This company has no plan on record.');

  return {
    plan: data.plan,
    provider: data.provider,
    status: data.status,
    truckLimit: data.truck_limit,
    aiQuota: data.ai_quota,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
  };
}
