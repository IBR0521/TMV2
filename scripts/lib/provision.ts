/**
 * Creating a demo carrier the way a real one is created: an account signs up,
 * calls tm_create_company_with_owner() as itself, invites its colleagues, and
 * each of them accepts. Nothing here reaches around RLS to insert a membership
 * by hand, so the seed exercises the same path a customer does.
 *
 * Development only. The caller checks that the target is a local database.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import type { Database } from '../../src/server/db/database.types';

export type Role = 'owner' | 'dispatcher' | 'accounting' | 'driver';

export type DemoPerson = { name: string; email: string; role: Role };

export type DemoCompany = {
  name: string;
  mcNumber: string;
  dotNumber: string;
  timezone: string;
  people: DemoPerson[];
};

export type Clients = {
  admin: SupabaseClient<Database>;
  url: string;
  anonKey: string;
};

export function clients(): Clients {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and ' +
        'SUPABASE_SERVICE_ROLE_KEY must be set. Run pnpm db:start then pnpm db:env.',
    );
  }

  return {
    url,
    anonKey,
    admin: createClient<Database>(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function isLocal(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(new URL(url).origin);
}

/** A signed-in client for one person, as the browser would have. */
export async function signedInAs(
  c: Clients,
  email: string,
  password: string,
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(c.url, c.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in as ${email}: ${error.message}`);
  return client;
}

async function ensureAccount(
  c: Clients,
  person: DemoPerson,
  password: string,
): Promise<void> {
  const { error } = await c.admin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true,
    user_metadata: { name: person.name },
  });

  if (error && !/already/i.test(error.message)) {
    throw new Error(`create ${person.email}: ${error.message}`);
  }
}

export async function provision(
  c: Clients,
  company: DemoCompany,
  password: string,
): Promise<{ companyId: string; created: boolean }> {
  const owner = company.people.find((p) => p.role === 'owner');
  if (!owner) throw new Error(`${company.name} has no owner`);

  for (const person of company.people) {
    await ensureAccount(c, person, password);
  }

  const existing = await c.admin
    .from('companies')
    .select('id')
    .eq('name', company.name)
    .maybeSingle();

  if (existing.data) {
    return { companyId: existing.data.id, created: false };
  }

  const ownerClient = await signedInAs(c, owner.email, password);
  const { data: companyId, error } = await ownerClient.rpc('tm_create_company_with_owner', {
    p_name: company.name,
    p_mc_number: company.mcNumber,
    p_dot_number: company.dotNumber,
    p_timezone: company.timezone,
  });

  if (error) throw new Error(`create ${company.name}: ${error.message}`);

  for (const person of company.people) {
    if (person.role === 'owner') continue;

    const token = randomBytes(32).toString('base64url');
    const invite = await ownerClient.from('invitations').insert({
      company_id: companyId as string,
      email: person.email,
      role: person.role,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    if (invite.error) throw new Error(`invite ${person.email}: ${invite.error.message}`);

    const theirClient = await signedInAs(c, person.email, password);
    const accepted = await theirClient.rpc('tm_accept_invitation', { p_token: token });
    if (accepted.error) {
      throw new Error(`accept for ${person.email}: ${accepted.error.message}`);
    }
  }

  return { companyId: companyId as string, created: true };
}
