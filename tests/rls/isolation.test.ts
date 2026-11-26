import { beforeAll, describe, expect, it } from 'vitest';
import { adminDb, createCarrier, tenantTables, type Carrier, type Db } from '../support/supabase';

/**
 * docs/spec/architecture.md, Data access rules:
 *
 *   "An RLS test creates two companies, then for every table with a company_id
 *    checks that company A can't read, insert, update or delete company B's
 *    rows. New tables are picked up automatically."
 *
 * The list of tables comes from the database (tm_tenant_tables), not from this
 * file, so a table added in a later phase is swept without anyone remembering.
 *
 * Every probe is judged by what happened to the data, not by which error came
 * back: an attempt that fails on a not-null constraint before RLS sees it would
 * otherwise look like proof when it is not.
 */
const admin: Db = adminDb();
const tables = await tenantTables(admin);

let alpha: Carrier;
let beta: Carrier;

beforeAll(async () => {
  [alpha, beta] = await Promise.all([createCarrier(admin, 'Alpha'), createCarrier(admin, 'Beta')]);
}, 120_000);

async function rowCount(companyId: string, table: string): Promise<number> {
  const { count, error } = await admin
    .from(table as never)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function oneRow(companyId: string, table: string): Promise<Record<string, unknown>> {
  const { data, error } = await admin
    .from(table as never)
    .select('*')
    .eq('company_id', companyId)
    .limit(1)
    .single();
  if (error) throw new Error(`${table} fixture row: ${error.message}`);
  return data as Record<string, unknown>;
}

describe('every table with a company_id', () => {
  it('is covered by this sweep', () => {
    // A reminder that the count grows with every phase; if it ever shrinks,
    // a table lost its company_id.
    expect(tables.length).toBeGreaterThanOrEqual(25);
    expect(tables).toContain('companies');
    expect(tables).toContain('memberships');
    expect(tables).toContain('suggestions');
    // Phase 2's fleet and customers, swept without this file listing them.
    expect(tables).toContain('drivers');
    expect(tables).toContain('trucks');
    expect(tables).toContain('customers');
    expect(tables).toContain('facilities');
    expect(tables).toContain('compliance_documents');
    // Phase 3's loads, swept the same way.
    expect(tables).toContain('loads');
    expect(tables).toContain('load_stops');
    expect(tables).toContain('load_charges');
    expect(tables).toContain('documents');
  });

  for (const table of tables) {
    describe(table, () => {
      it('has a row for each carrier to aim at', async () => {
        expect(await rowCount(alpha.companyId, table)).toBeGreaterThan(0);
        expect(await rowCount(beta.companyId, table)).toBeGreaterThan(0);
      });

      for (const direction of ['alpha-at-beta', 'beta-at-alpha'] as const) {
        describe(direction, () => {
          const actorOf = () => (direction === 'alpha-at-beta' ? alpha : beta);
          const targetOf = () => (direction === 'alpha-at-beta' ? beta : alpha);

          it('cannot be read across tenants', async () => {
            const { data, error } = await actorOf()
              .people.owner.db.from(table as never)
              .select('id')
              .eq('company_id', targetOf().companyId);

            // Either refused outright or simply empty: never another carrier's rows.
            expect(error ? [] : (data ?? [])).toEqual([]);
          });

          it('cannot be inserted into across tenants', async () => {
            const target = targetOf();
            const template = await oneRow(target.companyId, table);
            const before = await rowCount(target.companyId, table);

            await actorOf()
              .people.owner.db.from(table as never)
              .insert({ ...template, id: crypto.randomUUID() } as never);

            expect(await rowCount(target.companyId, table)).toBe(before);
          });

          it('cannot be updated across tenants', async () => {
            const target = targetOf();
            const before = await oneRow(target.companyId, table);

            await actorOf()
              .people.owner.db.from(table as never)
              .update({ updated_at: new Date(0).toISOString(), created_at: new Date(0).toISOString() } as never)
              .eq('company_id', target.companyId);

            const after = await oneRow(target.companyId, table);
            expect(after.created_at).toEqual(before.created_at);
            if ('updated_at' in before) {
              expect(after.updated_at).toEqual(before.updated_at);
            }
          });

          it('cannot be deleted across tenants', async () => {
            const target = targetOf();
            const before = await rowCount(target.companyId, table);

            await actorOf()
              .people.owner.db.from(table as never)
              .delete()
              .eq('company_id', target.companyId);

            expect(await rowCount(target.companyId, table)).toBe(before);
          });
        });
      }
    });
  }
});

describe('a carrier reads its own rows', () => {
  it('sees its own company and nothing else', async () => {
    const { data, error } = await alpha.people.owner.db.from('companies').select('id, name');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(alpha.companyId);
  });

  it('sees all four of its own people', async () => {
    const { data, error } = await alpha.people.owner.db.from('memberships').select('role');

    expect(error).toBeNull();
    expect((data ?? []).map((m) => m.role).sort()).toEqual([
      'accounting',
      'dispatcher',
      'driver',
      'owner',
    ]);
  });
});
