import { beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/context';
import { search } from '@/server/services/search';
import { adminDb, createCarrier, type Carrier, type Db } from '../support/supabase';

/**
 * Global search, from the service down to the database.
 *
 * Search is where a tenancy mistake would be most visible and least
 * forgivable: a dispatcher typing a name and seeing a stranger's driver. The
 * isolation sweep already proves no table can be read across tenants; this
 * proves the search service asks in a way that keeps it true, and that what a
 * carrier types is treated as text rather than as a pattern.
 */
const admin: Db = adminDb();

let alpha: Carrier;
let beta: Carrier;

/** The service uses the signed-in client and the company id, and nothing else. */
function ctxFor(carrier: Carrier): Ctx {
  const person = carrier.people.owner;
  return {
    userId: person.userId,
    authId: '',
    email: person.email,
    name: 'owner',
    db: person.db,
    companyId: carrier.companyId,
    role: 'owner',
    driverId: null,
  };
}

beforeAll(async () => {
  [alpha, beta] = await Promise.all([
    createCarrier(admin, 'Finder'),
    createCarrier(admin, 'Stranger'),
  ]);

  await admin.from('drivers').insert([
    { company_id: alpha.companyId, name: 'Ignatius Pepperwick' },
    { company_id: beta.companyId, name: 'Ignatius Pepperwick' },
  ]);
  await admin
    .from('trucks')
    .insert([{ company_id: beta.companyId, unit_number: 'ZZ-OTHER', plate: 'ZZ 0001' }]);
}, 180_000);

describe('a load', () => {
  it('is found by its own number', async () => {
    const admin2 = adminDb();
    const made = await admin2
      .from('loads')
      .insert({ company_id: alpha.companyId, load_number: 'QQ-4242' })
      .select('id')
      .single();
    expect(made.error).toBeNull();

    const { hits } = await search(ctxFor(alpha), 'QQ-4242');

    expect(hits[0]?.kind).toBe('load');
    expect(hits[0]?.href).toContain('/loads/');
  });

  // The broker's own number is the one they say on the phone, and the one a
  // dispatcher has in front of them when asked about a load they did not book.
  it('is found by the broker’s reference', async () => {
    await adminDb()
      .from('loads')
      .insert({
        company_id: alpha.companyId,
        load_number: 'QQ-4243',
        broker_ref: 'ZZREF-98765',
      });

    const { hits } = await search(ctxFor(alpha), 'ZZREF-98765');

    expect(hits.map((hit) => hit.kind)).toContain('load');
  });

  it('is not found by the other carrier', async () => {
    await adminDb()
      .from('loads')
      .insert({ company_id: beta.companyId, load_number: 'ZZ-OTHERLOAD' });

    expect((await search(ctxFor(alpha), 'ZZ-OTHERLOAD')).hits).toEqual([]);
  });
});

describe('a search', () => {
  it('finds this carrier’s own driver', async () => {
    const { hits } = await search(ctxFor(alpha), 'Pepperwick');

    expect(hits).toHaveLength(1);
    expect(hits[0]?.kind).toBe('driver');
    expect(hits[0]?.href).toContain('/fleet/drivers/');
  });

  // The same name exists at the other carrier. One hit, not two.
  it('does not find the other carrier’s driver of the same name', async () => {
    const { hits } = await search(ctxFor(alpha), 'Pepperwick');
    const ids = hits.map((hit) => hit.id);

    const theirs = await admin
      .from('drivers')
      .select('id')
      .eq('company_id', beta.companyId)
      .eq('name', 'Ignatius Pepperwick')
      .single();

    expect(ids).not.toContain(theirs.data?.id);
  });

  it('does not find the other carrier’s truck', async () => {
    const { hits } = await search(ctxFor(alpha), 'ZZ-OTHER');
    expect(hits).toEqual([]);
  });

  it('finds a truck by its unit number', async () => {
    await admin
      .from('trucks')
      .insert({ company_id: alpha.companyId, unit_number: 'QQ-777', plate: 'QQ 7777' });

    const { hits } = await search(ctxFor(alpha), 'QQ-777');
    expect(hits.map((hit) => hit.kind)).toContain('truck');
  });

  // A carrier typing % means a per cent sign, not "everything".
  it('treats a wildcard as text', async () => {
    const { hits } = await search(ctxFor(alpha), '%%');
    expect(hits).toEqual([]);
  });

  it('says nothing at all for one letter', async () => {
    const { hits } = await search(ctxFor(alpha), 'P');
    expect(hits).toEqual([]);
  });
});
