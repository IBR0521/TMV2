import type { Task } from 'graphile-worker';
import { serviceDb } from '../db';

/**
 * Putting facilities on the map, with the US Census geocoder.
 *
 * It is free, has no key and no quota to buy, and it is the one CLAUDE.md
 * rule 5 names. Each address is looked up once and the answer is stored
 * (rule 5 again: geocode each address once, store and reuse) — saving a
 * facility again only re-queues it if the address itself changed.
 *
 * What the job will not do:
 *  - overwrite a pin someone placed by hand (those rows are 'manual');
 *  - mark an address "not found" because the network failed. A request that
 *    errors leaves the row pending, so the next run tries again; only a
 *    successful answer with no matches is a real miss, and a real miss is
 *    something the office can fix.
 */
const BATCH = 25;
const GAP_MS = 250;
const TIMEOUT_MS = 10_000;

const ENDPOINT = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

export type Coordinates = { lat: number; lng: number };

/**
 * The one shape we want out of the Census response.
 *
 * Pure, and exported so it can be tested against real response bodies without
 * the network: x is longitude and y is latitude, which is the wrong way round
 * from how everyone says it, and is exactly the sort of thing to get wrong
 * once and never notice.
 */
export function parseCensusMatch(body: unknown): Coordinates | null {
  const result = (body as { result?: { addressMatches?: unknown } })?.result;
  const matches = Array.isArray(result?.addressMatches) ? result.addressMatches : [];
  const first = matches[0] as { coordinates?: { x?: unknown; y?: unknown } } | undefined;

  const lng = first?.coordinates?.x;
  const lat = first?.coordinates?.y;

  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

type Outcome = { found: Coordinates | null } | { failed: string };

async function lookUp(address: string): Promise<Outcome> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', 'user-agent': 'TruckMates/2.0' },
    });

    if (!response.ok) return { failed: `HTTP ${response.status}` };
    return { found: parseCensusMatch(await response.json()) };
  } catch (error) {
    return { failed: error instanceof Error ? error.message : 'request failed' };
  }
}

export const geocodeFacilities: Task = async (_payload, helpers) => {
  const db = serviceDb();

  const { data: waiting, error } = await db
    .from('facilities')
    .select('id, company_id, address')
    .eq('geocode_status', 'pending')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);

  if (error) throw new Error(`facilities: ${error.message}`);
  if (!waiting || waiting.length === 0) return;

  let found = 0;
  let missed = 0;
  let failed = 0;

  for (const facility of waiting) {
    const outcome = await lookUp(facility.address);

    if ('failed' in outcome) {
      // Left pending on purpose: the address is probably fine, the network
      // was not. The scheduled run tries again.
      failed += 1;
      helpers.logger.warn(`geocode ${facility.id}: ${outcome.failed}`);
      continue;
    }

    const update =
      outcome.found === null
        ? { geocode_status: 'not_found' as const, geocoded_at: new Date().toISOString() }
        : {
            lat: outcome.found.lat,
            lng: outcome.found.lng,
            geocode_status: 'found' as const,
            geocoded_at: new Date().toISOString(),
          };

    const { error: saveError } = await db
      .from('facilities')
      .update(update)
      .eq('company_id', facility.company_id)
      .eq('id', facility.id)
      // Nothing placed by hand is ever overwritten, even if this job was
      // queued before someone dragged the pin.
      .eq('geocode_status', 'pending');

    if (saveError) throw new Error(`facility ${facility.id}: ${saveError.message}`);

    if (outcome.found === null) missed += 1;
    else found += 1;

    // The Census geocoder is a free public service. One request at a time,
    // with a gap, is the least we can do.
    if (GAP_MS > 0) await new Promise((resolve) => setTimeout(resolve, GAP_MS));
  }

  helpers.logger.info(
    `geocode: ${found} placed, ${missed} not found, ${failed} left for the next run`,
  );
};
