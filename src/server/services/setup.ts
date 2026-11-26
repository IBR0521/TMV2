import type { Ctx } from '../context';
import { fail } from '../db/errors';

/**
 * What is still missing from a new carrier's setup.
 *
 * docs/spec/flows.md, step 6: the owner lands on Today "with a short
 * checklist". Every step after the company may be skipped, so the checklist is
 * worked out from what is actually there rather than from a flag somebody has
 * to remember to set — a carrier who imported their fleet through Settings
 * instead of the wizard has done the step, and should not be nagged about it.
 */
export type SetupTask = {
  key: 'fleet' | 'customers' | 'team';
  title: string;
  detail: string;
  href: string;
};

async function count(ctx: Ctx, table: 'trucks' | 'drivers' | 'customers'): Promise<number> {
  const { count: found, error } = await ctx.db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ctx.companyId)
    .is('archived_at', null);

  if (error) fail(error, 'The setup checklist could not be read.');
  return found ?? 0;
}

export async function remainingSetup(ctx: Ctx): Promise<SetupTask[]> {
  const [trucks, drivers, customers, team] = await Promise.all([
    count(ctx, 'trucks'),
    count(ctx, 'drivers'),
    count(ctx, 'customers'),
    ctx.db
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId),
  ]);

  if (team.error) fail(team.error, 'The setup checklist could not be read.');

  const tasks: SetupTask[] = [];

  if (trucks === 0 || drivers === 0) {
    tasks.push({
      key: 'fleet',
      title: 'Add your trucks and drivers',
      detail:
        trucks === 0 && drivers === 0
          ? 'Import a spreadsheet, or add a few by hand.'
          : trucks === 0
            ? 'The drivers are in; the trucks are not.'
            : 'The trucks are in; the drivers are not.',
      href: '/onboarding/fleet',
    });
  }

  if (customers === 0) {
    tasks.push({
      key: 'customers',
      title: 'Add the brokers you haul for',
      detail: 'Import your customer list, or add the first one by hand.',
      href: '/onboarding/customers',
    });
  }

  // One member is the owner alone. Nobody has to invite anyone, but a carrier
  // running single-handed is worth asking once.
  if ((team.count ?? 0) <= 1) {
    tasks.push({
      key: 'team',
      title: 'Invite your dispatcher',
      detail: 'Or whoever answers the phone when you are driving.',
      href: '/onboarding/team',
    });
  }

  return tasks;
}
