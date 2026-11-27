import type { Ctx, Session } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

export type Company = {
  id: string;
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  timezone: string;
  /** Placeholders the profit estimate uses until phases 6 and 7. */
  driverPayCentsPerMile: number;
  fuelCentsPerMile: number;
};

export type NewCompany = {
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  timezone: string;
};

/**
 * Signup. The account is signed in but belongs to nothing yet, so RLS would
 * rightly refuse a plain insert; tm_create_company_with_owner() does the whole
 * bootstrap (company, owner membership, 14-day trial, number sequences, audit
 * row) for auth.uid() and takes no company_id.
 */
export async function createCompany(session: Session, input: NewCompany): Promise<string> {
  const { data, error } = await session.db.rpc('tm_create_company_with_owner', {
    p_name: input.name,
    // The function turns an empty string into null itself.
    p_mc_number: input.mcNumber ?? '',
    p_dot_number: input.dotNumber ?? '',
    p_timezone: input.timezone,
  });

  if (error) fail(error, 'This account already belongs to a company.');
  return data as string;
}

export async function getCompany(ctx: Ctx): Promise<Company> {
  const { data, error } = await ctx.db
    .from('companies')
    .select(
      'id, name, mc_number, dot_number, timezone, driver_pay_cents_per_mile, fuel_cents_per_mile',
    )
    .eq('id', ctx.companyId)
    .single();

  if (error) fail(error, 'That company could not be read.');

  return {
    id: data.id,
    name: data.name,
    mcNumber: data.mc_number,
    dotNumber: data.dot_number,
    timezone: data.timezone,
    driverPayCentsPerMile: data.driver_pay_cents_per_mile,
    fuelCentsPerMile: data.fuel_cents_per_mile,
  };
}

export type CompanyEdit = {
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  timezone: string;
  driverPayCentsPerMile: number;
  fuelCentsPerMile: number;
};

/**
 * The carrier's own details.
 *
 * The owner changes these, not the whole office: the time zone decides when a
 * pay week ends and the two rates decide what every load looks like it makes,
 * so they are not things a dispatcher should be able to move by accident.
 */
export async function updateCompany(ctx: Ctx, input: CompanyEdit): Promise<void> {
  const before = await getCompany(ctx);

  const { data, error } = await ctx.db
    .from('companies')
    .update({
      name: input.name,
      mc_number: input.mcNumber,
      dot_number: input.dotNumber,
      timezone: input.timezone,
      driver_pay_cents_per_mile: input.driverPayCentsPerMile,
      fuel_cents_per_mile: input.fuelCentsPerMile,
    })
    .eq('id', ctx.companyId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That could not be saved.');
  if (data === null) throw new ActionError('This company could not be found.');

  await audit.record(ctx, {
    action: 'company.updated',
    subjectType: 'company',
    subjectId: ctx.companyId,
    before,
    after: input,
  });
}
