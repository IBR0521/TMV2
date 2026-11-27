import { dwellAt, type Dwell } from '../../src/domain/detention';
import { serviceDb } from '../db';

/**
 * How long the truck sat at a stop, and where.
 *
 * The trigger hands the rule the stop row, which knows when it arrived and
 * left but not how much free time that dock allows — that is on the facility.
 * This fetches the missing half so the rule can stay a pure function.
 */
export type StopDwell = {
  dwell: Dwell | null;
  loadId: string | null;
  loadNumber: string | null;
  facilityName: string | null;
  freeMinutes: number;
};

export async function stopDwellFor(companyId: string, stopId: string): Promise<StopDwell> {
  const db = serviceDb();

  const { data: stop, error } = await db
    .from('load_stops')
    .select('load_id, facility_id, arrived_at, departed_at')
    .eq('company_id', companyId)
    .eq('id', stopId)
    .maybeSingle();

  if (error) throw new Error(`stop: ${error.message}`);
  if (stop === null) {
    return { dwell: null, loadId: null, loadNumber: null, facilityName: null, freeMinutes: 0 };
  }

  const [facility, load] = await Promise.all([
    stop.facility_id === null
      ? Promise.resolve({ data: null, error: null })
      : db
          .from('facilities')
          .select('name, detention_free_minutes')
          .eq('company_id', companyId)
          .eq('id', stop.facility_id)
          .maybeSingle(),
    db
      .from('loads')
      .select('load_number')
      .eq('company_id', companyId)
      .eq('id', stop.load_id)
      .maybeSingle(),
  ]);

  if (facility.error) throw new Error(`facility: ${facility.error.message}`);
  if (load.error) throw new Error(`load: ${load.error.message}`);

  // A stop with no facility has no free time on record. Charging from the
  // first minute would be a guess about somebody else's dock, so it is
  // treated as generous rather than mean: two hours, the usual.
  const freeMinutes = facility.data?.detention_free_minutes ?? 120;

  return {
    dwell: dwellAt({
      arrivedAt: stop.arrived_at,
      departedAt: stop.departed_at,
      freeMinutes,
    }),
    loadId: stop.load_id,
    loadNumber: load.data?.load_number ?? null,
    facilityName: facility.data?.name ?? null,
    freeMinutes,
  };
}
