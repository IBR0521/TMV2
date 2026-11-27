import type { Ctx } from '../context';
import { todayInZone } from '../clock';
import { fail } from '../db/errors';
import { listLoads, type LoadRow } from './loads';

/**
 * The dispatch board: trucks down the side, days across the top, and the loads
 * waiting for a driver beside it (docs/spec/screens.md, row 5).
 *
 * Everything here is derived from loads and stops rather than stored. There is
 * no "where is truck 117 on Thursday" table to go stale: a load with a pickup
 * on Wednesday and a delivery on Friday occupies Wednesday to Friday because
 * that is what its stops say.
 *
 * The window is four days starting today in the carrier's own zone, which is
 * what the approved screen shows.
 */
export const BOARD_DAYS = 4;

export type BoardDay = { date: string; label: string; today: boolean };

export type BoardBlock = {
  loadId: string | null;
  kind: 'load' | 'late' | 'free' | 'suggested' | 'home';
  startDay: number;
  span: number;
  title: string;
  detail: string | null;
};

export type BoardTruck = {
  truckId: string;
  unit: string;
  driver: string;
  blocks: BoardBlock[];
};

export type Board = {
  days: BoardDay[];
  trucks: BoardTruck[];
  unassigned: LoadRow[];
  /** Who can be put on a load, for the assign form. */
  drivers: { id: string; name: string }[];
  trucksForAssigning: { id: string; unit: string }[];
};

function addDays(date: string, days: number): string {
  const when = new Date(`${date}T00:00:00Z`);
  when.setUTCDate(when.getUTCDate() + days);
  return when.toISOString().slice(0, 10);
}

function dayLabel(date: string, isToday: boolean): string {
  const label = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
  return isToday ? `${label} · today` : label;
}

/** Which day column a moment falls in, or null if it is outside the window. */
function columnFor(iso: string | null, days: BoardDay[], timezone: string): number | null {
  if (iso === null) return null;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(iso));
  const index = days.findIndex((day) => day.date === date);
  return index === -1 ? null : index + 1;
}

export async function board(ctx: Ctx): Promise<Board> {
  const { data: company, error: companyError } = await ctx.db
    .from('companies')
    .select('timezone')
    .eq('id', ctx.companyId)
    .single();
  if (companyError) fail(companyError, 'This company could not be read.');

  const timezone = company.timezone;
  const start = todayInZone(timezone);

  const days: BoardDay[] = Array.from({ length: BOARD_DAYS }, (_, index) => {
    const date = addDays(start, index);
    return { date, label: dayLabel(date, index === 0), today: index === 0 };
  });

  const [loads, trucks, drivers] = await Promise.all([
    listLoads(ctx),
    ctx.db
      .from('trucks')
      .select('id, unit_number, owner_driver_id')
      .eq('company_id', ctx.companyId)
      .eq('status', 'active')
      .is('archived_at', null)
      .order('unit_number', { ascending: true }),
    ctx.db
      .from('drivers')
      .select('id, name')
      .eq('company_id', ctx.companyId)
      .eq('status', 'active')
      .is('archived_at', null)
      .order('name', { ascending: true }),
  ]);

  if (trucks.error) fail(trucks.error, 'The trucks could not be read.');
  if (drivers.error) fail(drivers.error, 'The drivers could not be read.');

  const driverName = new Map(drivers.data.map((row) => [row.id, row.name] as const));
  const last = days[days.length - 1];

  // A load is on the board if any part of it falls in the window.
  const inWindow = (load: LoadRow): boolean => {
    if (load.status === 'cancelled' || load.status === 'delivered') return false;
    const from = columnFor(load.firstPickupAt, days, timezone);
    const to = columnFor(load.lastDeliveryAt, days, timezone);
    if (from !== null || to !== null) return true;
    // It may also straddle the whole window: picked up before, delivered after.
    return (
      load.firstPickupAt !== null &&
      load.lastDeliveryAt !== null &&
      load.firstPickupAt < `${days[0]?.date ?? start}T00:00:00Z` &&
      load.lastDeliveryAt > `${last?.date ?? start}T23:59:59Z`
    );
  };

  const onBoard = loads.filter(inWindow);

  const blocksFor = (truckId: string): BoardBlock[] => {
    const mine = onBoard.filter((load) => load.truckId === truckId);
    const blocks: BoardBlock[] = [];
    const covered = new Set<number>();

    for (const load of mine) {
      const from = columnFor(load.firstPickupAt, days, timezone) ?? 1;
      const to = columnFor(load.lastDeliveryAt, days, timezone) ?? BOARD_DAYS;
      const startDay = Math.max(1, Math.min(from, to));
      const span = Math.max(1, Math.min(BOARD_DAYS - startDay + 1, Math.abs(to - from) + 1));

      for (let day = startDay; day < startDay + span; day += 1) covered.add(day);

      // Late means the truck should have been loaded by now and was not.
      // Whether it is actually moving is phase 4's business, when the driver
      // app starts reporting; until then the appointment is what we know.
      const overdue =
        load.status === 'dispatched' &&
        load.firstPickupAt !== null &&
        load.firstPickupAt < new Date().toISOString();

      blocks.push({
        loadId: load.id,
        kind: overdue ? 'late' : 'load',
        startDay,
        span,
        title: `#${load.loadNumber} ${load.from ?? '—'} → ${load.to ?? '—'}`,
        detail: overdue ? 'Pickup time has passed' : load.customerName,
      });
    }

    // Whatever is left is a gap, and a gap is a truck earning nothing — which
    // is the thing a dispatcher is looking for on this screen.
    let day = 1;
    while (day <= BOARD_DAYS) {
      if (covered.has(day)) {
        day += 1;
        continue;
      }
      let span = 0;
      while (day + span <= BOARD_DAYS && !covered.has(day + span)) span += 1;
      blocks.push({
        loadId: null,
        kind: 'free',
        startDay: day,
        span,
        title: 'Available',
        detail: null,
      });
      day += span;
    }

    return blocks.sort((a, b) => a.startDay - b.startDay);
  };

  return {
    days,
    trucks: trucks.data.map((truck) => {
      const running = onBoard.find((load) => load.truckId === truck.id && load.driverName !== null);
      const owner = truck.owner_driver_id === null ? null : driverName.get(truck.owner_driver_id);

      return {
        truckId: truck.id,
        unit: truck.unit_number,
        driver: running?.driverName ?? owner ?? 'No driver',
        blocks: blocksFor(truck.id),
      };
    }),
    unassigned: onBoard
      .filter((load) => load.driverId === null)
      .sort((a, b) => (a.firstPickupAt ?? '').localeCompare(b.firstPickupAt ?? '')),
    drivers: drivers.data.map((row) => ({ id: row.id, name: row.name })),
    trucksForAssigning: trucks.data.map((row) => ({ id: row.id, unit: row.unit_number })),
  };
}
