import { formatPhone } from '@/domain/fleet';
import { loadStatusLabel } from '@/domain/load';
import type { Ctx } from '../context';
import { fail } from '../db/errors';

/**
 * Global search (docs/build-plan.md, phase 2 step 10: "Global search now finds
 * drivers, trucks and customers").
 *
 * Every query is scoped by company_id and checked again by RLS, so a search is
 * one of the places where getting it wrong would be most visible and least
 * forgivable: typing a competitor's driver's name must find nothing.
 *
 * Facilities are in here too. They are not on the build plan's list, but a
 * dispatcher looking for "Sunbelt" means the dock, and leaving them out would
 * make the search feel broken rather than deliberate.
 *
 * Loads are found by their own number and by the broker's reference, which is
 * the number a broker says on the phone — and the one a dispatcher has in
 * front of them when they are asked about a load they did not book.
 */
export type SearchHit = {
  kind: 'load' | 'driver' | 'truck' | 'trailer' | 'customer' | 'facility';
  id: string;
  title: string;
  detail: string;
  href: string;
};

export type SearchResults = {
  term: string;
  hits: SearchHit[];
};

const PER_KIND = 8;

/**
 * What a carrier types is treated as text, never as a pattern: % and _ are
 * wildcards to Postgres and punctuation to everyone else.
 */
function literal(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function search(ctx: Ctx, rawTerm: string): Promise<SearchResults> {
  const term = rawTerm.trim();
  if (term.length < 2) return { term, hits: [] };

  const like = `%${literal(term)}%`;

  const [loads, drivers, trucks, trailers, customers, facilities] = await Promise.all([
    ctx.db
      .from('loads')
      .select('id, load_number, status, broker_ref, customer_id')
      .eq('company_id', ctx.companyId)
      .or(`load_number.ilike.${like},broker_ref.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(PER_KIND),
    ctx.db
      .from('drivers')
      .select('id, name, phone, home_location')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .ilike('name', like)
      .order('name')
      .limit(PER_KIND),
    ctx.db
      .from('trucks')
      .select('id, unit_number, plate, vin')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .or(`unit_number.ilike.${like},plate.ilike.${like},vin.ilike.${like}`)
      .order('unit_number')
      .limit(PER_KIND),
    ctx.db
      .from('trailers')
      .select('id, unit_number, type')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .ilike('unit_number', like)
      .order('unit_number')
      .limit(PER_KIND),
    ctx.db
      .from('customers')
      .select('id, name, type, mc_number')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .or(`name.ilike.${like},mc_number.ilike.${like}`)
      .order('name')
      .limit(PER_KIND),
    ctx.db
      .from('facilities')
      .select('id, name, address')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .or(`name.ilike.${like},address.ilike.${like}`)
      .order('name')
      .limit(PER_KIND),
  ]);

  // One at a time rather than in a loop: a loop checks them all but tells the
  // type checker nothing, and `data` stays possibly-null afterwards.
  if (loads.error) fail(loads.error, 'The search could not be run.');
  if (drivers.error) fail(drivers.error, 'The search could not be run.');
  if (trucks.error) fail(trucks.error, 'The search could not be run.');
  if (trailers.error) fail(trailers.error, 'The search could not be run.');
  if (customers.error) fail(customers.error, 'The search could not be run.');
  if (facilities.error) fail(facilities.error, 'The search could not be run.');

  // Customers are looked up so a load can say who it is for, which is what a
  // dispatcher is checking when they search a broker's reference.
  const customerName = new Map(
    (
      await ctx.db.from('customers').select('id, name').eq('company_id', ctx.companyId)
    ).data?.map((row) => [row.id, row.name] as const) ?? [],
  );

  const hits: SearchHit[] = [
    ...loads.data.map((row): SearchHit => ({
      kind: 'load',
      id: row.id,
      title: `Load #${row.load_number}`,
      detail: [
        loadStatusLabel(row.status),
        row.customer_id === null ? null : customerName.get(row.customer_id) ?? null,
        row.broker_ref === null ? null : `Ref ${row.broker_ref}`,
      ]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · '),
      href: `/loads/${row.id}`,
    })),
    ...drivers.data.map((row): SearchHit => ({
      kind: 'driver',
      id: row.id,
      title: row.name,
      detail: [row.phone === null ? null : formatPhone(row.phone), row.home_location]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · '),
      href: `/fleet/drivers/${row.id}`,
    })),
    ...trucks.data.map((row): SearchHit => ({
      kind: 'truck',
      id: row.id,
      title: `Truck ${row.unit_number}`,
      detail: [row.plate, row.vin === null ? null : `VIN …${row.vin.slice(-6)}`]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · '),
      href: `/fleet/units/${row.id}`,
    })),
    ...trailers.data.map((row): SearchHit => ({
      kind: 'trailer',
      id: row.id,
      title: `Trailer ${row.unit_number}`,
      detail: row.type.replace('_', ' '),
      href: `/fleet/units/${row.id}`,
    })),
    ...customers.data.map((row): SearchHit => ({
      kind: 'customer',
      id: row.id,
      title: row.name,
      detail: [row.type === 'broker' ? 'Broker' : 'Shipper', row.mc_number === null ? null : `MC ${row.mc_number}`]
        .filter((part): part is string => part !== null && part !== '')
        .join(' · '),
      href: `/customers/${row.id}`,
    })),
    ...facilities.data.map((row): SearchHit => ({
      kind: 'facility',
      id: row.id,
      title: row.name,
      detail: row.address,
      href: `/customers/facilities/${row.id}`,
    })),
  ];

  return { term, hits };
}
