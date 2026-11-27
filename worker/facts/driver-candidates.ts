import type { DriverCandidate, Place } from '../../src/domain/dispatch';
import { serviceDb } from '../db';

/**
 * The facts the dispatch rule needs and cannot look up for itself.
 *
 * A rule is a pure function, so the database work lives here. What comes back
 * is plain data: who could take this load, where their last delivery left
 * them, and whether anything else of theirs runs across the pickup day.
 */
export type Candidates = { candidates: DriverCandidate[]; pickup: Place | null };

/** The day a stop falls on, in the facility's own zone. */
function dayOf(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export async function driverCandidatesFor(
  companyId: string,
  loadId: string,
): Promise<Candidates> {
  const db = serviceDb();

  const { data: stops, error: stopsError } = await db
    .from('load_stops')
    .select('seq, type, appt_start, timezone, facility_id')
    .eq('company_id', companyId)
    .eq('load_id', loadId)
    .order('seq', { ascending: true });

  if (stopsError) throw new Error(`stops: ${stopsError.message}`);

  const firstPickup = (stops ?? []).find((stop) => stop.type === 'pickup');

  let pickup: Place | null = null;
  if (firstPickup?.facility_id != null) {
    const { data: facility, error } = await db
      .from('facilities')
      .select('lat, lng')
      .eq('company_id', companyId)
      .eq('id', firstPickup.facility_id)
      .maybeSingle();

    if (error) throw new Error(`pickup facility: ${error.message}`);
    if (facility?.lat != null && facility.lng != null) {
      pickup = { lat: facility.lat, lng: facility.lng };
    }
  }

  const pickupDay =
    firstPickup?.appt_start == null
      ? null
      : dayOf(firstPickup.appt_start, firstPickup.timezone);

  const [drivers, trucks, otherLoads, facilities] = await Promise.all([
    db
      .from('drivers')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .is('archived_at', null),
    db
      .from('trucks')
      .select('id, unit_number, owner_driver_id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .is('archived_at', null),
    db
      .from('loads')
      .select('id, driver_id, truck_id, status')
      .eq('company_id', companyId)
      .neq('id', loadId)
      .not('driver_id', 'is', null)
      .in('status', ['booked', 'dispatched', 'in_transit', 'delivered']),
    db.from('facilities').select('id, lat, lng').eq('company_id', companyId),
  ]);

  if (drivers.error) throw new Error(`drivers: ${drivers.error.message}`);
  if (trucks.error) throw new Error(`trucks: ${trucks.error.message}`);
  if (otherLoads.error) throw new Error(`other loads: ${otherLoads.error.message}`);
  if (facilities.error) throw new Error(`facilities: ${facilities.error.message}`);

  const otherIds = otherLoads.data.map((load) => load.id);
  const { data: otherStops, error: otherStopsError } =
    otherIds.length === 0
      ? { data: [], error: null }
      : await db
          .from('load_stops')
          .select('load_id, type, seq, appt_start, timezone, facility_id')
          .eq('company_id', companyId)
          .in('load_id', otherIds)
          .order('seq', { ascending: true });

  if (otherStopsError) throw new Error(`other stops: ${otherStopsError.message}`);

  const coords = new Map(
    facilities.data
      .filter((row) => row.lat !== null && row.lng !== null)
      .map((row) => [row.id, { lat: row.lat as number, lng: row.lng as number }] as const),
  );

  // Busy means something else of theirs touches the pickup day. With no
  // pickup time on the load there is nothing to clash with, so nobody is
  // ruled out — better to suggest someone and be corrected than to say
  // "nobody is free" because a date is missing.
  const busy = new Set<string>();
  if (pickupDay !== null) {
    for (const load of otherLoads.data) {
      if (load.driver_id === null || load.status === 'delivered') continue;
      const days = (otherStops ?? [])
        .filter((stop) => stop.load_id === load.id && stop.appt_start !== null)
        .map((stop) => dayOf(stop.appt_start as string, stop.timezone));

      const first = days[0];
      const last = days[days.length - 1];
      if (first === undefined || last === undefined) continue;
      if (first <= pickupDay && pickupDay <= last) busy.add(load.driver_id);
    }
  }

  // Where each driver's most recent delivery leaves them.
  const lastDrop = new Map<string, Place>();
  for (const load of otherLoads.data) {
    if (load.driver_id === null) continue;
    const deliveries = (otherStops ?? []).filter(
      (stop) => stop.load_id === load.id && stop.type === 'delivery',
    );
    const final = deliveries[deliveries.length - 1];
    if (final?.facility_id == null) continue;
    const place = coords.get(final.facility_id);
    if (place !== undefined) lastDrop.set(load.driver_id, place);
  }

  const unitById = new Map(trucks.data.map((row) => [row.id, row.unit_number] as const));

  // Which truck to offer each driver, in order of what a dispatcher would
  // assume: the one they own, then the one they usually run, then a spare.
  // Suggesting somebody else's truck to a driver who has their own reads as a
  // mistake even when it is not.
  const truckFor = new Map<string, { id: string; unit: string }>();

  for (const load of otherLoads.data) {
    if (load.driver_id === null || load.truck_id === null) continue;
    if (truckFor.has(load.driver_id)) continue;
    const unit = unitById.get(load.truck_id);
    if (unit !== undefined) truckFor.set(load.driver_id, { id: load.truck_id, unit });
  }

  for (const truck of trucks.data) {
    if (truck.owner_driver_id !== null) {
      truckFor.set(truck.owner_driver_id, { id: truck.id, unit: truck.unit_number });
    }
  }
  // Whatever is left over can go to anybody: the first free truck is offered
  // to drivers who do not own one.
  const spokenFor = new Set([
    ...trucks.data.filter((truck) => truck.owner_driver_id !== null).map((truck) => truck.id),
    ...[...truckFor.values()].map((truck) => truck.id),
  ]);
  const busyTruckIds = new Set(
    otherLoads.data
      .filter((load) => load.truck_id !== null && load.status !== 'delivered')
      .map((load) => load.truck_id as string),
  );
  const spare = trucks.data.filter(
    (truck) => !spokenFor.has(truck.id) && !busyTruckIds.has(truck.id),
  );

  let nextSpare = 0;
  const candidates: DriverCandidate[] = drivers.data.map((driver) => {
    let truck = truckFor.get(driver.id) ?? null;
    if (truck === null && !busy.has(driver.id)) {
      const offered = spare[nextSpare];
      if (offered !== undefined) {
        truck = { id: offered.id, unit: offered.unit_number };
        nextSpare += 1;
      }
    }

    return {
      driverId: driver.id,
      driverName: driver.name,
      truckId: truck?.id ?? null,
      truckUnit: truck?.unit ?? null,
      free: !busy.has(driver.id),
      lastDropAt: lastDrop.get(driver.id) ?? null,
      // Nothing records home time yet. The driver app brings it in phase 4;
      // until then the ranking rests on who is free and who is closest, and
      // the card says only what it actually knows.
      daysSinceHome: null,
    };
  });

  return { candidates, pickup };
}
