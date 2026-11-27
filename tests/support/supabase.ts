/**
 * What the RLS tests need: an admin client to set two carriers up with, and a
 * signed-in client per person to prove what each of them can and cannot reach.
 *
 * Tests are the one place besides worker/ and the seed script that may hold the
 * service-role key; tests/actions pins that allowlist down.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import type { Database } from '@/server/db/database.types';
import type { Role } from '@/domain/roles';

loadEnv({ path: ['.env.local', '.env'] });

export type Db = SupabaseClient<Database>;

const PASSWORD = 'truckmates-test-password';

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Start the local stack first: pnpm db:start && pnpm db:env.`,
    );
  }
  return value;
}

export function adminDb(): Db {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonDb(): Db {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Person = { email: string; role: Role; db: Db; userId: string };

export type Carrier = {
  name: string;
  companyId: string;
  people: Record<Role, Person>;
  /** Phase 2: the two driver rows in the fixture — the signed-in one and a colleague. */
  fleet: { driverId: string; colleagueDriverId: string };
};

async function createAccount(admin: Db, email: string, name: string): Promise<void> {
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`create ${email}: ${error.message}`);
}

async function signIn(email: string): Promise<Db> {
  const db = anonDb();
  const { error } = await db.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return db;
}

async function profileId(db: Db): Promise<string> {
  const { data, error } = await db.from('users').select('id').limit(1).single();
  if (error) throw new Error(`profile: ${error.message}`);
  return data.id;
}

/**
 * A whole carrier, created the way a real one is: the owner signs up and
 * invites the rest, each of whom accepts. Names are unique per run so tests
 * never collide with the seed or with each other.
 */
export async function createCarrier(admin: Db, label: string): Promise<Carrier> {
  const tag = randomUUID().slice(0, 8);
  const name = `${label} ${tag}`;
  const roles: Role[] = ['owner', 'dispatcher', 'accounting', 'driver'];

  const emails = Object.fromEntries(
    roles.map((role) => [role, `${role}-${tag}@${label.toLowerCase()}.test`]),
  ) as Record<Role, string>;

  for (const role of roles) {
    await createAccount(admin, emails[role], `${label} ${role}`);
  }

  const ownerDb = await signIn(emails.owner);
  const { data: companyId, error } = await ownerDb.rpc('tm_create_company_with_owner', {
    p_name: name,
    p_mc_number: `MC${tag}`,
    p_dot_number: '',
    p_timezone: 'America/Chicago',
  });
  if (error) throw new Error(`create ${name}: ${error.message}`);

  const people = {} as Record<Role, Person>;
  people.owner = { email: emails.owner, role: 'owner', db: ownerDb, userId: await profileId(ownerDb) };

  for (const role of roles.filter((r) => r !== 'owner')) {
    const token = randomBytes(32).toString('base64url');
    const invite = await ownerDb.from('invitations').insert({
      company_id: companyId as string,
      email: emails[role],
      role,
      token,
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    if (invite.error) throw new Error(`invite ${role}: ${invite.error.message}`);

    const db = await signIn(emails[role]);
    const accepted = await db.rpc('tm_accept_invitation', { p_token: token });
    if (accepted.error) throw new Error(`accept ${role}: ${accepted.error.message}`);

    people[role] = { email: emails[role], role, db, userId: await profileId(db) };
  }

  const fleet = await fillEveryTenantTable(admin, ownerDb, companyId as string);

  // From phase 2 a driver login points at a driver row, and the narrow driver
  // policies key off that link. Without it those policies match nothing and a
  // test that passes proves nothing.
  const link = await admin
    .from('memberships')
    .update({ driver_id: fleet.driverId })
    .eq('company_id', companyId as string)
    .eq('user_id', people.driver.userId);
  if (link.error) throw new Error(`link driver: ${link.error.message}`);

  return { name, companyId: companyId as string, people, fleet };
}

/**
 * Puts one row in every tenant table, so the isolation sweep has something to
 * fail at in each of them. Signup already covers companies, memberships,
 * subscriptions, number_sequences, audit_log and invitations; these are the
 * rest. The worker writes suggestions in life, the admin client here.
 */
async function fillEveryTenantTable(
  admin: Db,
  ownerDb: Db,
  companyId: string,
): Promise<{ driverId: string; colleagueDriverId: string }> {
  const ping = await ownerDb
    .from('automation_test_pings')
    .insert({ company_id: companyId, note: 'fixture' })
    .select('id')
    .single();
  if (ping.error) throw new Error(`ping: ${ping.error.message}`);

  // Phase 2. Two drivers and a customer go in first: the compliance documents
  // and the contact hang off them with composite keys, so they need real ids.
  // Two drivers, not one, because "a driver reads its own paperwork" is only
  // proved by a colleague's row it must not reach.
  const driver = await admin
    .from('drivers')
    .insert({ company_id: companyId, name: 'Fixture Driver' })
    .select('id')
    .single();
  if (driver.error) throw new Error(`driver: ${driver.error.message}`);

  const colleague = await admin
    .from('drivers')
    .insert({ company_id: companyId, name: 'Fixture Colleague' })
    .select('id')
    .single();
  if (colleague.error) throw new Error(`colleague: ${colleague.error.message}`);

  const customer = await admin
    .from('customers')
    .insert({ company_id: companyId, name: 'Fixture Broker' })
    .select('id')
    .single();
  if (customer.error) throw new Error(`customer: ${customer.error.message}`);

  // Phase 3. A draft load with a stop, a charge, state miles and a document,
  // so the isolation sweep has something to aim at in each of them.
  const load = await admin
    .from('loads')
    .insert({ company_id: companyId, load_number: 'FIXTURE-1', status: 'draft' })
    .select('id')
    .single();
  if (load.error) throw new Error(`load: ${load.error.message}`);

  const fixtureFile = await admin
    .from('files')
    .insert({
      company_id: companyId,
      storage_path: `${companyId}/fixture-document.pdf`,
      mime: 'application/pdf',
      size_bytes: 2048,
    })
    .select('id')
    .single();
  if (fixtureFile.error) throw new Error(`document file: ${fixtureFile.error.message}`);

  const rows = await Promise.all([
    admin.from('suggestions').insert({
      company_id: companyId,
      type: 'test.ping',
      title: 'A test event arrived',
      dedupe_key: `fixture:${companyId}`,
      action_name: 'acknowledge',
    }),
    admin.from('automation_settings').insert({
      company_id: companyId,
      rule_key: 'test.ping.acknowledge',
      mode: 'suggest',
    }),
    admin.from('ai_usage').insert({
      company_id: companyId,
      month: `${new Date().toISOString().slice(0, 7)}-01`,
      documents: 1,
    }),
    admin.from('files').insert({
      company_id: companyId,
      storage_path: `${companyId}/fixture.pdf`,
      mime: 'application/pdf',
      size_bytes: 1024,
    }),
    admin.from('trucks').insert({ company_id: companyId, unit_number: '900' }),
    admin.from('trailers').insert({ company_id: companyId, unit_number: 'T900' }),
    admin.from('facilities').insert({
      company_id: companyId,
      name: 'Fixture Dock',
      address: '1 Main Street, Dallas, TX 75201',
    }),
    admin.from('compliance_documents').insert({
      company_id: companyId,
      driver_id: driver.data.id,
      kind: 'cdl',
      expires_on: '2027-06-30',
    }),
    admin.from('compliance_documents').insert({
      company_id: companyId,
      driver_id: colleague.data.id,
      kind: 'medical',
      expires_on: '2027-03-31',
    }),
    admin.from('customer_contacts').insert({
      company_id: companyId,
      customer_id: customer.data.id,
      name: 'Fixture Contact',
    }),
    admin.from('import_mappings').insert({
      company_id: companyId,
      kind: 'trucks',
      columns: { 'Unit #': 'unit_number' },
    }),
    admin.from('load_stops').insert({
      company_id: companyId,
      load_id: load.data.id,
      seq: 1,
      type: 'pickup',
    }),
    admin.from('load_charges').insert({
      company_id: companyId,
      load_id: load.data.id,
      kind: 'linehaul',
      amount_cents: 250_000,
    }),
    admin.from('load_state_miles').insert({
      company_id: companyId,
      load_id: load.data.id,
      state: 'TX',
      miles: 120,
    }),
    admin.from('documents').insert({
      company_id: companyId,
      file_id: fixtureFile.data.id,
      kind: 'rate_con',
      load_id: load.data.id,
    }),
    admin.from('check_calls').insert({
      company_id: companyId,
      load_id: load.data.id,
      location: 'Fixture, somewhere on the interstate',
    }),
  ]);

  for (const row of rows) {
    if (row.error) throw new Error(`fixture row: ${row.error.message}`);
  }

  return { driverId: driver.data.id, colleagueDriverId: colleague.data.id };
}

/** Every table in public that carries a company_id: the RLS sweep's subjects. */
export async function tenantTables(admin: Db): Promise<string[]> {
  const { data, error } = await admin.rpc('tm_tenant_tables');
  if (error || !data) {
    throw new Error(
      `tm_tenant_tables() is missing or failed (${error?.message ?? 'no rows'}). ` +
        'It is created by a migration and is what makes new tables covered automatically.',
    );
  }
  return data.map((row) => row.table_name);
}
