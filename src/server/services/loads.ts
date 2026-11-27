import {
  type Charge,
  type ChargeKind,
  type LoadEffect,
  type LoadStatus,
  estimateProfit,
  moveTo,
  rateCents,
  type ProfitEstimate,
} from '@/domain/load';
import { instantFromWallClock } from '@/domain/time';
import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

/**
 * Loads: the thing the rest of the product is about.
 *
 * Every function takes ctx and reads company_id from it, never from input.
 * Status changes go through src/domain/load.ts and nowhere else — this module
 * applies what the machine returns and writes the audit entry, but it does not
 * decide anything about what a load may become.
 */
export type LoadRow = {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  customerId: string | null;
  customerName: string | null;
  brokerRef: string | null;
  driverId: string | null;
  driverName: string | null;
  truckId: string | null;
  truckUnit: string | null;
  trailerId: string | null;
  totalMiles: number | null;
  emptyMiles: number | null;
  notes: string | null;
  from: string | null;
  to: string | null;
  firstPickupAt: string | null;
  lastDeliveryAt: string | null;
  rateCents: number;
  estimate: ProfitEstimate;
};

export type StopRow = {
  id: string;
  seq: number;
  type: 'pickup' | 'delivery';
  facilityId: string | null;
  facilityName: string | null;
  city: string | null;
  apptStart: string | null;
  apptEnd: string | null;
  timezone: string;
  arrivedAt: string | null;
  departedAt: string | null;
  reference: string | null;
  notes: string | null;
};

export type ChargeRow = {
  id: string;
  kind: ChargeKind;
  description: string | null;
  amountCents: number;
  billCustomer: boolean;
  payDriver: boolean;
};

type Rates = { driverPayCentsPerMile: number; fuelCentsPerMile: number };

async function ratesFor(ctx: Ctx): Promise<Rates> {
  const { data, error } = await ctx.db
    .from('companies')
    .select('driver_pay_cents_per_mile, fuel_cents_per_mile')
    .eq('id', ctx.companyId)
    .single();

  if (error) fail(error, 'This company could not be read.');
  return {
    driverPayCentsPerMile: data.driver_pay_cents_per_mile,
    fuelCentsPerMile: data.fuel_cents_per_mile,
  };
}

/**
 * The next load number for this carrier.
 *
 * One UPDATE ... RETURNING, which Postgres serialises on the row: two
 * dispatchers pressing New load at the same instant get different numbers.
 * No database function takes a company_id (CLAUDE.md rule 1) — the scoping is
 * in the WHERE, and RLS checks it again.
 */
async function nextLoadNumber(ctx: Ctx): Promise<string> {
  const { data: sequence, error: readError } = await ctx.db
    .from('number_sequences')
    .select('next_value, prefix')
    .eq('company_id', ctx.companyId)
    .eq('name', 'load')
    .single();

  if (readError) fail(readError, 'This company has no load numbering set up.');

  const { data, error } = await ctx.db
    .from('number_sequences')
    .update({ next_value: sequence.next_value + 1 })
    .eq('company_id', ctx.companyId)
    .eq('name', 'load')
    .eq('next_value', sequence.next_value)
    .select('next_value')
    .maybeSingle();

  if (error) fail(error, 'A load number could not be taken.');
  // Somebody else took this one between the read and the write. One retry is
  // enough: the loser of a race is not usually the loser twice.
  if (data === null) return nextLoadNumber(ctx);

  return `${sequence.prefix}${sequence.next_value}`;
}

// One string literal, not a concatenation: supabase-js reads the columns from
// the literal to type the result, and a joined string types as an error.
const LOAD_COLUMNS =
  'id, load_number, status, customer_id, broker_ref, driver_id, truck_id, trailer_id, total_miles, empty_miles, notes, created_at';

function chargesOf(rows: { amount_cents: number; bill_customer: boolean; pay_driver: boolean }[]): Charge[] {
  return rows.map((row) => ({
    amountCents: row.amount_cents,
    billCustomer: row.bill_customer,
    payDriver: row.pay_driver,
  }));
}

/**
 * The list, with everything a dispatcher scans for: who is on it, what it
 * pays, what is left of that.
 *
 * Four reads and a stitch rather than one nested select: loads reach
 * customers, drivers, trucks, stops and charges, and the embed hints needed to
 * disambiguate that are harder to read than the joining.
 */
export async function listLoads(ctx: Ctx, only?: { loadId: string }): Promise<LoadRow[]> {
  const rates = await ratesFor(ctx);

  const loadQuery = ctx.db.from('loads').select(LOAD_COLUMNS).eq('company_id', ctx.companyId);
  const stopQuery = ctx.db
    .from('load_stops')
    .select('load_id, seq, type, appt_start, facility_id')
    .eq('company_id', ctx.companyId);
  const chargeQuery = ctx.db
    .from('load_charges')
    .select('load_id, amount_cents, bill_customer, pay_driver')
    .eq('company_id', ctx.companyId);

  const [loads, customers, drivers, trucks, stops, charges] = await Promise.all([
    only === undefined
      ? loadQuery.order('created_at', { ascending: false })
      : loadQuery.eq('id', only.loadId),
    ctx.db.from('customers').select('id, name').eq('company_id', ctx.companyId),
    ctx.db.from('drivers').select('id, name').eq('company_id', ctx.companyId),
    ctx.db.from('trucks').select('id, unit_number').eq('company_id', ctx.companyId),
    only === undefined
      ? stopQuery.order('seq', { ascending: true })
      : stopQuery.eq('load_id', only.loadId).order('seq', { ascending: true }),
    only === undefined ? chargeQuery : chargeQuery.eq('load_id', only.loadId),
  ]);

  if (loads.error) fail(loads.error, 'The loads could not be read.');
  if (customers.error) fail(customers.error, 'The customers could not be read.');
  if (drivers.error) fail(drivers.error, 'The drivers could not be read.');
  if (trucks.error) fail(trucks.error, 'The trucks could not be read.');
  if (stops.error) fail(stops.error, 'The stops could not be read.');
  if (charges.error) fail(charges.error, 'The charges could not be read.');

  const facilities = await ctx.db
    .from('facilities')
    .select('id, name')
    .eq('company_id', ctx.companyId);
  if (facilities.error) fail(facilities.error, 'The facilities could not be read.');

  const customerName = new Map(customers.data.map((row) => [row.id, row.name] as const));
  const driverName = new Map(drivers.data.map((row) => [row.id, row.name] as const));
  const truckUnit = new Map(trucks.data.map((row) => [row.id, row.unit_number] as const));
  const facilityName = new Map(facilities.data.map((row) => [row.id, row.name] as const));

  const stopsByLoad = new Map<string, typeof stops.data>();
  for (const stop of stops.data) {
    const list = stopsByLoad.get(stop.load_id) ?? [];
    list.push(stop);
    stopsByLoad.set(stop.load_id, list);
  }

  const chargesByLoad = new Map<string, typeof charges.data>();
  for (const charge of charges.data) {
    const list = chargesByLoad.get(charge.load_id) ?? [];
    list.push(charge);
    chargesByLoad.set(charge.load_id, list);
  }

  return loads.data.map((row) => {
    const ownStops = stopsByLoad.get(row.id) ?? [];
    const pickups = ownStops.filter((stop) => stop.type === 'pickup');
    const deliveries = ownStops.filter((stop) => stop.type === 'delivery');
    const ownCharges = chargesOf(chargesByLoad.get(row.id) ?? []);

    const firstPickup = pickups[0];
    const lastDelivery = deliveries[deliveries.length - 1];

    return {
      id: row.id,
      loadNumber: row.load_number,
      status: row.status,
      customerId: row.customer_id,
      customerName: row.customer_id === null ? null : customerName.get(row.customer_id) ?? null,
      brokerRef: row.broker_ref,
      driverId: row.driver_id,
      driverName: row.driver_id === null ? null : driverName.get(row.driver_id) ?? null,
      truckId: row.truck_id,
      truckUnit: row.truck_id === null ? null : truckUnit.get(row.truck_id) ?? null,
      trailerId: row.trailer_id,
      totalMiles: row.total_miles,
      emptyMiles: row.empty_miles,
      notes: row.notes,
      from:
        firstPickup?.facility_id == null ? null : facilityName.get(firstPickup.facility_id) ?? null,
      to:
        lastDelivery?.facility_id == null
          ? null
          : facilityName.get(lastDelivery.facility_id) ?? null,
      firstPickupAt: firstPickup?.appt_start ?? null,
      lastDeliveryAt: lastDelivery?.appt_start ?? null,
      rateCents: rateCents(ownCharges),
      estimate: estimateProfit({ charges: ownCharges, miles: row.total_miles, ...rates }),
    };
  });
}

export type LoadDetail = {
  load: LoadRow;
  stops: StopRow[];
  charges: ChargeRow[];
};

export async function getLoad(ctx: Ctx, loadId: string): Promise<LoadDetail | null> {
  // The same code path as the list, scoped to one load — so a status change on
  // a carrier with a thousand loads does not read a thousand loads.
  const [load] = await listLoads(ctx, { loadId });
  if (load === undefined) return null;

  const [stops, charges, facilities] = await Promise.all([
    ctx.db
      .from('load_stops')
      .select('id, seq, type, facility_id, appt_start, appt_end, timezone, arrived_at, departed_at, reference, notes')
      .eq('company_id', ctx.companyId)
      .eq('load_id', loadId)
      .order('seq', { ascending: true }),
    ctx.db
      .from('load_charges')
      .select('id, kind, description, amount_cents, bill_customer, pay_driver')
      .eq('company_id', ctx.companyId)
      .eq('load_id', loadId)
      .order('created_at', { ascending: true }),
    ctx.db.from('facilities').select('id, name, address').eq('company_id', ctx.companyId),
  ]);

  if (stops.error) fail(stops.error, 'The stops could not be read.');
  if (charges.error) fail(charges.error, 'The charges could not be read.');
  if (facilities.error) fail(facilities.error, 'The facilities could not be read.');

  const byId = new Map(facilities.data.map((row) => [row.id, row] as const));

  return {
    load,
    stops: stops.data.map((row) => {
      const facility = row.facility_id === null ? undefined : byId.get(row.facility_id);
      return {
        id: row.id,
        seq: row.seq,
        type: row.type,
        facilityId: row.facility_id,
        facilityName: facility?.name ?? null,
        city: facility?.address ?? null,
        apptStart: row.appt_start,
        apptEnd: row.appt_end,
        timezone: row.timezone,
        arrivedAt: row.arrived_at,
        departedAt: row.departed_at,
        reference: row.reference,
        notes: row.notes,
      };
    }),
    charges: charges.data.map((row) => ({
      id: row.id,
      kind: row.kind,
      description: row.description,
      amountCents: row.amount_cents,
      billCustomer: row.bill_customer,
      payDriver: row.pay_driver,
    })),
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------
export type LoadInput = {
  id?: string;
  customerId: string | null;
  brokerRef: string | null;
  totalMiles: number | null;
  emptyMiles: number | null;
  notes: string | null;
};

export async function saveLoad(ctx: Ctx, input: LoadInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    customer_id: input.customerId,
    broker_ref: input.brokerRef,
    total_miles: input.totalMiles,
    empty_miles: input.emptyMiles,
    notes: input.notes,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db
      .from('loads')
      .insert({ ...row, load_number: await nextLoadNumber(ctx), created_by: ctx.userId })
      .select('id, load_number')
      .single();

    if (error) fail(error, 'That load could not be created.');
    await audit.record(ctx, {
      action: 'load.created',
      subjectType: 'load',
      subjectId: data.id,
      after: { load_number: data.load_number },
    });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('loads')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That load could not be saved.');
  if (data === null) throw new ActionError('That load no longer exists.');

  await audit.record(ctx, {
    action: 'load.updated',
    subjectType: 'load',
    subjectId: data.id,
    after: row,
  });
  return data.id;
}

/**
 * Move a load from one status to the next.
 *
 * src/domain/load.ts decides; this applies. Every effect it returns is carried
 * out in the same update as the status, so a load is never left half-moved —
 * dispatched with the driver already cleared, say.
 */
export async function moveLoad(ctx: Ctx, loadId: string, to: LoadStatus): Promise<void> {
  const detail = await getLoad(ctx, loadId);
  if (detail === null) throw new ActionError('That load no longer exists.');

  const { load, stops, charges } = detail;

  const move = moveTo(
    {
      status: load.status,
      hasCustomer: load.customerId !== null,
      pickups: stops.filter((stop) => stop.type === 'pickup').length,
      deliveries: stops.filter((stop) => stop.type === 'delivery').length,
      billableCents: load.rateCents,
      hasDriver: load.driverId !== null,
      hasTruck: load.truckId !== null,
    },
    to,
  );

  if (!move.ok) throw new ActionError(move.because);

  type LoadPatch = {
    status: LoadStatus;
    booked_at?: string;
    dispatched_at?: string | null;
    delivered_at?: string;
    cancelled_at?: string;
    driver_id?: null;
    truck_id?: null;
    trailer_id?: null;
  };

  const patch: LoadPatch = { status: move.status };
  const now = new Date().toISOString();
  let tonu = false;

  for (const effect of move.effects as LoadEffect[]) {
    if (effect.kind === 'stamp') patch[effect.field] = now;
    if (effect.kind === 'clear_assignment') {
      patch.driver_id = null;
      patch.truck_id = null;
      patch.trailer_id = null;
      patch.dispatched_at = null;
    }
    if (effect.kind === 'add_tonu_charge') tonu = true;
  }

  const { data, error } = await ctx.db
    .from('loads')
    .update(patch)
    .eq('company_id', ctx.companyId)
    .eq('id', loadId)
    // The status we read is the status we are moving from. If somebody else
    // moved it meanwhile, this changes nothing and says so.
    .eq('status', load.status)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That load could not be moved.');
  if (data === null) throw new ActionError('Someone else has already moved that load.');

  if (tonu) {
    const { error: chargeError } = await ctx.db.from('load_charges').insert({
      company_id: ctx.companyId,
      load_id: loadId,
      kind: 'tonu',
      description: 'Truck ordered, not used',
      // The carrier decides what to charge; the line exists so it is not
      // forgotten, and zero is honest until somebody types a figure.
      amount_cents: 0,
      bill_customer: true,
      pay_driver: false,
    });
    if (chargeError) fail(chargeError, 'The TONU charge could not be added.');
  }

  await audit.record(ctx, {
    action: `load.${move.status}`,
    subjectType: 'load',
    subjectId: loadId,
    before: { status: load.status },
    after: { status: move.status, charges: charges.length },
  });
}

/** Put a driver and a truck on a load. Dispatching is a separate move. */
export async function assign(
  ctx: Ctx,
  loadId: string,
  driverId: string,
  truckId: string,
  trailerId: string | null,
): Promise<void> {
  const { data, error } = await ctx.db
    .from('loads')
    .update({ driver_id: driverId, truck_id: truckId, trailer_id: trailerId })
    .eq('company_id', ctx.companyId)
    .eq('id', loadId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That driver could not be put on the load.');
  if (data === null) throw new ActionError('That load no longer exists.');

  await audit.record(ctx, {
    action: 'load.assigned',
    subjectType: 'load',
    subjectId: loadId,
    after: { driver_id: driverId, truck_id: truckId, trailer_id: trailerId },
  });
}

// ---------------------------------------------------------------------------
// Stops and charges
// ---------------------------------------------------------------------------
export type StopInput = {
  id?: string;
  loadId: string;
  seq: number;
  type: 'pickup' | 'delivery';
  facilityId: string | null;
  apptStart: string | null;
  apptEnd: string | null;
  reference: string | null;
  notes: string | null;
};

/**
 * A stop keeps the facility's time zone beside its appointment, so an 08:00
 * appointment goes on meaning 08:00 at that dock even if the facility is
 * edited later. The zone is copied at save time for that reason.
 */
export async function saveStop(ctx: Ctx, input: StopInput): Promise<string> {
  let timezone = 'America/Chicago';

  if (input.facilityId !== null) {
    const { data, error } = await ctx.db
      .from('facilities')
      .select('timezone')
      .eq('company_id', ctx.companyId)
      .eq('id', input.facilityId)
      .maybeSingle();

    if (error) fail(error, 'That facility could not be read.');
    if (data === null) throw new ActionError('That facility no longer exists.');
    timezone = data.timezone;
  }

  // The appointment is the time at this dock, so it is read in this dock's
  // zone — not the browser's and not the server's.
  const apptStart =
    input.apptStart === null ? null : instantFromWallClock(input.apptStart, timezone);
  const apptEnd = input.apptEnd === null ? null : instantFromWallClock(input.apptEnd, timezone);

  if (input.apptStart !== null && apptStart === null) {
    throw new ActionError('That appointment time could not be read.');
  }

  const row = {
    company_id: ctx.companyId,
    load_id: input.loadId,
    seq: input.seq,
    type: input.type,
    facility_id: input.facilityId,
    appt_start: apptStart,
    appt_end: apptEnd,
    timezone,
    reference: input.reference,
    notes: input.notes,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('load_stops').insert(row).select('id').single();
    if (error) fail(error, 'That stop could not be added. Each stop needs its own number.');
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('load_stops')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That stop could not be saved.');
  if (data === null) throw new ActionError('That stop no longer exists.');
  return data.id;
}

export async function removeStop(ctx: Ctx, stopId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('load_stops')
    .delete()
    .eq('company_id', ctx.companyId)
    .eq('id', stopId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That stop could not be removed.');
  if (data === null) throw new ActionError('That stop no longer exists.');
}

/** Arriving and leaving. Detention in phase 3a is worked out from these. */
export async function markStopTime(
  ctx: Ctx,
  stopId: string,
  field: 'arrived_at' | 'departed_at',
  /** A wall-clock time at the dock, read in the stop's own zone. */
  at: string,
): Promise<void> {
  const { data: stop, error: stopError } = await ctx.db
    .from('load_stops')
    .select('timezone')
    .eq('company_id', ctx.companyId)
    .eq('id', stopId)
    .maybeSingle();

  if (stopError) fail(stopError, 'That stop could not be read.');
  if (stop === null) throw new ActionError('That stop no longer exists.');

  const instant = instantFromWallClock(at, stop.timezone);
  if (instant === null) throw new ActionError('That time could not be read.');

  // Written out rather than computed: a computed key types as "any column",
  // which would let a typo through to the database.
  const patch =
    field === 'arrived_at' ? { arrived_at: instant } : { departed_at: instant };

  const { data, error } = await ctx.db
    .from('load_stops')
    .update(patch)
    .eq('company_id', ctx.companyId)
    .eq('id', stopId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That time could not be saved. A truck cannot leave before it arrives.');
  if (data === null) throw new ActionError('That stop no longer exists.');

  await audit.record(ctx, {
    action: `stop.${field === 'arrived_at' ? 'arrived' : 'departed'}`,
    subjectType: 'load_stop',
    subjectId: stopId,
    after: { [field]: instant },
  });
}

export type ChargeInput = {
  id?: string;
  loadId: string;
  kind: ChargeKind;
  description: string | null;
  amountCents: number;
  billCustomer: boolean;
  payDriver: boolean;
};

export async function saveCharge(ctx: Ctx, input: ChargeInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    load_id: input.loadId,
    kind: input.kind,
    description: input.description,
    amount_cents: input.amountCents,
    bill_customer: input.billCustomer,
    pay_driver: input.payDriver,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('load_charges').insert(row).select('id').single();
    if (error) fail(error, 'That charge could not be added.');
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('load_charges')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That charge could not be saved.');
  if (data === null) throw new ActionError('That charge no longer exists.');
  return data.id;
}

export async function removeCharge(ctx: Ctx, chargeId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('load_charges')
    .delete()
    .eq('company_id', ctx.companyId)
    .eq('id', chargeId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That charge could not be removed.');
  if (data === null) throw new ActionError('That charge no longer exists.');
}

// ---------------------------------------------------------------------------
// What happened to a load
// ---------------------------------------------------------------------------
export type TimelineEntry = { at: string; what: string };

const AUDIT_WORDS: Record<string, string> = {
  'load.created': 'Created',
  'load.updated': 'Details changed',
  'load.booked': 'Booked',
  'load.dispatched': 'Dispatched',
  'load.in_transit': 'Picked up',
  'load.delivered': 'Delivered',
  'load.cancelled': 'Cancelled',
  'load.assigned': 'Driver and truck assigned',
};

/**
 * The load's own history, read from the audit log rather than kept a second
 * time on the load.
 *
 * The audit log is append-only and already records who did what, so a separate
 * history column could only ever disagree with it. Check calls join this list
 * in their own step; stop times are already in it.
 */
export async function timeline(ctx: Ctx, loadId: string): Promise<TimelineEntry[]> {
  const { data: stops, error: stopsError } = await ctx.db
    .from('load_stops')
    .select('id')
    .eq('company_id', ctx.companyId)
    .eq('load_id', loadId);

  if (stopsError) fail(stopsError, 'The history could not be read.');

  const subjectIds = [loadId, ...stops.map((stop) => stop.id)];

  const { data, error } = await ctx.db
    .from('audit_log')
    .select('action, created_at, after')
    .eq('company_id', ctx.companyId)
    .in('subject_id', subjectIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) fail(error, 'The history could not be read.');

  return data.map((row) => ({
    at: row.created_at,
    what: AUDIT_WORDS[row.action] ?? friendly(row.action),
  }));
}

/** An action nobody has written words for is shown as itself, not hidden. */
function friendly(action: string): string {
  const words = action.split('.').pop() ?? action;
  return words.charAt(0).toUpperCase() + words.slice(1).replace(/_/g, ' ');
}
