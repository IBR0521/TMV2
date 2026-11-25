import type { Ctx, Session } from '../context';
import { fail } from '../db/errors';

export type Company = {
  id: string;
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  timezone: string;
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
    .select('id, name, mc_number, dot_number, timezone')
    .eq('id', ctx.companyId)
    .single();

  if (error) fail(error, 'That company could not be read.');

  return {
    id: data.id,
    name: data.name,
    mcNumber: data.mc_number,
    dotNumber: data.dot_number,
    timezone: data.timezone,
  };
}
