/**
 * Demo loads, so the phase 3 screens can be judged with a week's work on them.
 *
 * Development only; the caller has already checked the database is local, and
 * it is idempotent — a company that already has loads is left alone.
 *
 * The figures are the ones docs/spec/approved-mockups.md uses, so the loads
 * list, the dispatch board and the mockups all tell the same story. Dates are
 * relative to the day the seed runs, so the board always has today in it.
 */
import type { Clients } from './provision';

type StopSeed = {
  facility: string;
  type: 'pickup' | 'delivery';
  /** Days from today, and the hour at the dock. */
  inDays: number;
  hour: number;
  arrivedHour?: number;
  departedHour?: number;
};

type ChargeSeed = {
  kind: 'linehaul' | 'fuel_surcharge' | 'detention' | 'lumper' | 'layover' | 'tonu' | 'other';
  amount: number;
  billCustomer?: boolean;
  payDriver?: boolean;
  description?: string;
};

type LoadSeed = {
  status: 'draft' | 'booked' | 'dispatched' | 'in_transit' | 'delivered';
  customer: string;
  brokerRef: string;
  driver?: string;
  truck?: string;
  miles: number;
  emptyMiles?: number;
  stops: StopSeed[];
  charges: ChargeSeed[];
  notes?: string;
};

export const ALPHA_LOADS: LoadSeed[] = [
  {
    status: 'in_transit',
    customer: 'Northline Logistics',
    brokerRef: 'NL-883102',
    driver: 'Luis Ortega',
    truck: '117',
    miles: 790,
    emptyMiles: 42,
    stops: [
      { facility: 'Northline Dallas DC', type: 'pickup', inDays: -2, hour: 8, arrivedHour: 7, departedHour: 9 },
      { facility: 'Atlanta Crossdock', type: 'delivery', inDays: 0, hour: 14 },
    ],
    charges: [
      { kind: 'linehaul', amount: 2_520_00 },
      { kind: 'fuel_surcharge', amount: 192_00 },
    ],
  },
  {
    status: 'in_transit',
    customer: 'Gulf Coast Produce',
    brokerRef: 'GCP-5512',
    driver: 'Dee Baker',
    truck: '104',
    miles: 243,
    stops: [
      { facility: 'Gulf Coast Houston Cold', type: 'pickup', inDays: -1, hour: 6, arrivedHour: 5, departedHour: 8 },
      { facility: 'Memphis Rail Yard', type: 'delivery', inDays: 0, hour: 16 },
    ],
    charges: [
      { kind: 'linehaul', amount: 880_00 },
      { kind: 'detention', amount: 70_00, description: '2 hours over free time at pickup' },
    ],
    notes: 'Reefer at 34F. Driver reported 45 minutes late out of Houston.',
  },
  {
    status: 'dispatched',
    customer: 'Midwest Dry Goods',
    brokerRef: 'HFF-7781',
    driver: 'Ray Kim',
    truck: '115',
    miles: 239,
    stops: [
      { facility: 'Gulf Coast Houston Cold', type: 'pickup', inDays: 0, hour: 9 },
      { facility: 'Northline Dallas DC', type: 'delivery', inDays: 0, hour: 18 },
    ],
    charges: [{ kind: 'linehaul', amount: 880_00 }],
  },
  {
    status: 'booked',
    customer: 'Northline Logistics',
    brokerRef: 'NL-883140',
    miles: 532,
    stops: [
      { facility: 'Memphis Rail Yard', type: 'pickup', inDays: 1, hour: 8 },
      { facility: 'Atlanta Crossdock', type: 'delivery', inDays: 2, hour: 10 },
    ],
    charges: [
      { kind: 'linehaul', amount: 1_800_00 },
      { kind: 'fuel_surcharge', amount: 175_00 },
    ],
  },
  {
    status: 'booked',
    customer: 'Prime Shippers',
    brokerRef: 'RMR-0094',
    miles: 794,
    stops: [
      { facility: 'Northline Dallas DC', type: 'pickup', inDays: 2, hour: 6 },
      { facility: 'Denver Retail DC', type: 'delivery', inDays: 3, hour: 12 },
    ],
    charges: [{ kind: 'linehaul', amount: 2_310_00 }],
  },
  {
    status: 'delivered',
    customer: 'Prime Shippers',
    brokerRef: 'PS-4401',
    driver: 'Luis Ortega',
    truck: '117',
    miles: 476,
    stops: [
      { facility: 'Memphis Rail Yard', type: 'pickup', inDays: -5, hour: 7, arrivedHour: 6, departedHour: 8 },
      { facility: 'Atlanta Crossdock', type: 'delivery', inDays: -3, hour: 15, arrivedHour: 14, departedHour: 16 },
    ],
    charges: [
      { kind: 'linehaul', amount: 2_900_00 },
      { kind: 'lumper', amount: 220_00, payDriver: true, description: 'Paid at the dock, reimbursed' },
    ],
  },
  {
    status: 'delivered',
    customer: 'Gulf Coast Produce',
    brokerRef: 'GCP-5498',
    driver: 'Dee Baker',
    truck: '104',
    miles: 383,
    stops: [
      { facility: 'Gulf Coast Houston Cold', type: 'pickup', inDays: -6, hour: 5, arrivedHour: 4, departedHour: 6 },
      { facility: 'Northline Dallas DC', type: 'delivery', inDays: -5, hour: 13, arrivedHour: 12, departedHour: 13 },
    ],
    charges: [{ kind: 'linehaul', amount: 1_420_00 }],
  },
  {
    status: 'draft',
    customer: 'Delta River Foods',
    brokerRef: 'DRF-3310',
    miles: 348,
    stops: [
      { facility: 'Gulf Coast Houston Cold', type: 'pickup', inDays: 3, hour: 13 },
    ],
    charges: [{ kind: 'linehaul', amount: 1_640_00 }],
    notes: 'Rate con came in this morning. Delivery dock still to confirm.',
  },
];

function at(inDays: number, hour: number): string {
  const when = new Date();
  when.setUTCDate(when.getUTCDate() + inDays);
  when.setUTCHours(hour, 0, 0, 0);
  return when.toISOString();
}

export async function seedLoads(
  c: Clients,
  companyId: string,
  seeds: LoadSeed[],
): Promise<{ added: number }> {
  const existing = await c.admin
    .from('loads')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (existing.error) throw new Error(`loads: ${existing.error.message}`);
  if ((existing.count ?? 0) > 0) return { added: 0 };

  const [customers, drivers, trucks, facilities, sequence] = await Promise.all([
    c.admin.from('customers').select('id, name').eq('company_id', companyId),
    c.admin.from('drivers').select('id, name').eq('company_id', companyId),
    c.admin.from('trucks').select('id, unit_number').eq('company_id', companyId),
    c.admin.from('facilities').select('id, name').eq('company_id', companyId),
    c.admin
      .from('number_sequences')
      .select('next_value')
      .eq('company_id', companyId)
      .eq('name', 'load')
      .single(),
  ]);

  for (const result of [customers, drivers, trucks, facilities, sequence]) {
    if (result.error) throw new Error(`loads lookup: ${result.error.message}`);
  }

  const customerId = new Map((customers.data ?? []).map((row) => [row.name, row.id] as const));
  const driverId = new Map((drivers.data ?? []).map((row) => [row.name, row.id] as const));
  const truckId = new Map((trucks.data ?? []).map((row) => [row.unit_number, row.id] as const));
  const facilityId = new Map((facilities.data ?? []).map((row) => [row.name, row.id] as const));

  let next = sequence.data?.next_value ?? 1000;
  let added = 0;

  for (const seed of seeds) {
    const assigned = seed.driver !== undefined && seed.truck !== undefined;

    const load = await c.admin
      .from('loads')
      .insert({
        company_id: companyId,
        load_number: String(next),
        status: seed.status,
        source: 'manual',
        customer_id: customerId.get(seed.customer) ?? null,
        broker_ref: seed.brokerRef,
        driver_id: assigned ? driverId.get(seed.driver ?? '') ?? null : null,
        truck_id: assigned ? truckId.get(seed.truck ?? '') ?? null : null,
        total_miles: seed.miles,
        empty_miles: seed.emptyMiles ?? null,
        notes: seed.notes ?? null,
      })
      .select('id')
      .single();

    if (load.error) throw new Error(`load ${next}: ${load.error.message}`);

    const stops = await c.admin.from('load_stops').insert(
      seed.stops.map((stop, index) => ({
        company_id: companyId,
        load_id: load.data.id,
        seq: index + 1,
        type: stop.type,
        facility_id: facilityId.get(stop.facility) ?? null,
        appt_start: at(stop.inDays, stop.hour),
        appt_end: at(stop.inDays, stop.hour + 2),
        arrived_at: stop.arrivedHour === undefined ? null : at(stop.inDays, stop.arrivedHour),
        departed_at: stop.departedHour === undefined ? null : at(stop.inDays, stop.departedHour),
      })),
    );
    if (stops.error) throw new Error(`stops for ${next}: ${stops.error.message}`);

    const charges = await c.admin.from('load_charges').insert(
      seed.charges.map((charge) => ({
        company_id: companyId,
        load_id: load.data.id,
        kind: charge.kind,
        description: charge.description ?? null,
        amount_cents: charge.amount,
        bill_customer: charge.billCustomer ?? true,
        pay_driver: charge.payDriver ?? false,
      })),
    );
    if (charges.error) throw new Error(`charges for ${next}: ${charges.error.message}`);

    next += 1;
    added += 1;
  }

  const bumped = await c.admin
    .from('number_sequences')
    .update({ next_value: next })
    .eq('company_id', companyId)
    .eq('name', 'load');
  if (bumped.error) throw new Error(`load numbering: ${bumped.error.message}`);

  return { added };
}
