import { beforeAll, describe, expect, it } from 'vitest';
import { adminDb, createCarrier, type Carrier, type Db } from '../support/supabase';

/**
 * "Drivers get a narrower policy" (CLAUDE.md, rule 1).
 *
 * auth_company_ids() returns office memberships only, so the uniform tenant
 * policy never covers a driver. That is what makes a table added in a later
 * phase invisible to drivers until someone writes a driver policy for it on
 * purpose. A driver's whole world is its own company row, its own profile and
 * membership, and — from phase 2 — its own driver row and its own expiring
 * paperwork. Nothing else in the fleet, and nothing of a colleague's.
 */
const admin: Db = adminDb();

let carrier: Carrier;

beforeAll(async () => {
  carrier = await createCarrier(admin, 'Narrow');
}, 120_000);

describe('a driver', () => {
  it('reads the company it works for', async () => {
    const { data, error } = await carrier.people.driver.db.from('companies').select('id, name');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(carrier.companyId);
  });

  it('reads its own membership and no colleague’s', async () => {
    const { data, error } = await carrier.people.driver.db
      .from('memberships')
      .select('role, user_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.role).toBe('driver');
    expect(data?.[0]?.user_id).toBe(carrier.people.driver.userId);
  });

  for (const table of [
    'suggestions',
    'events',
    'audit_log',
    'invitations',
    'number_sequences',
    'files',
    'ai_usage',
    'automation_settings',
    'automation_test_pings',
    'subscriptions',
    // Phase 2's fleet and customers: a driver has no business in any of them.
    'trucks',
    'trailers',
    'customers',
    'customer_contacts',
    'facilities',
    'import_mappings',
  ] as const) {
    it(`sees nothing in ${table}`, async () => {
      const { data, error } = await carrier.people.driver.db.from(table).select('id');
      expect(error ? [] : (data ?? [])).toEqual([]);
    });
  }

  it('reads its own driver row and no colleague’s', async () => {
    const { data, error } = await carrier.people.driver.db.from('drivers').select('id, name');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(carrier.fleet.driverId);
  });

  it('reads its own paperwork and no colleague’s', async () => {
    const { data, error } = await carrier.people.driver.db
      .from('compliance_documents')
      .select('kind, driver_id');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.kind).toBe('cdl');
    expect(data?.[0]?.driver_id).toBe(carrier.fleet.driverId);
  });

  it('cannot change its own paperwork', async () => {
    const before = await admin
      .from('compliance_documents')
      .select('expires_on')
      .eq('driver_id', carrier.fleet.driverId)
      .single();

    await carrier.people.driver.db
      .from('compliance_documents')
      .update({ expires_on: '2030-01-01' })
      .eq('driver_id', carrier.fleet.driverId);

    const after = await admin
      .from('compliance_documents')
      .select('expires_on')
      .eq('driver_id', carrier.fleet.driverId)
      .single();

    expect(after.data?.expires_on).toBe(before.data?.expires_on);
  });

  it('cannot put anything into the automation pipe', async () => {
    const before = await admin
      .from('automation_test_pings')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', carrier.companyId);

    await carrier.people.driver.db
      .from('automation_test_pings')
      .insert({ company_id: carrier.companyId, note: 'from a driver' });

    const after = await admin
      .from('automation_test_pings')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', carrier.companyId);

    expect(after.count).toBe(before.count);
  });

  it('cannot invite anyone', async () => {
    const result = await carrier.people.driver.db.from('invitations').insert({
      company_id: carrier.companyId,
      email: 'stranger@elsewhere.test',
      role: 'dispatcher',
      token: 'x'.repeat(43),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(result.error).not.toBeNull();
  });
});

describe('the office', () => {
  it('lets a dispatcher put something into the automation pipe', async () => {
    const result = await carrier.people.dispatcher.db
      .from('automation_test_pings')
      .insert({ company_id: carrier.companyId, note: 'from a dispatcher' })
      .select('id')
      .single();

    expect(result.error).toBeNull();
    expect(result.data?.id).toBeTruthy();
  });

  it('cannot edit its own plan', async () => {
    const before = await admin
      .from('subscriptions')
      .select('truck_limit')
      .eq('company_id', carrier.companyId)
      .single();

    await carrier.people.owner.db
      .from('subscriptions')
      .update({ truck_limit: 500 })
      .eq('company_id', carrier.companyId);

    const after = await admin
      .from('subscriptions')
      .select('truck_limit')
      .eq('company_id', carrier.companyId)
      .single();

    expect(after.data?.truck_limit).toBe(before.data?.truck_limit);
  });
});
