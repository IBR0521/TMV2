/**
 * Facilities: the docks freight moves through.
 *
 * Pure: no database, no network, no clock.
 *
 * A facility carries its own IANA time zone because phase 3 stores appointment
 * windows against it — an 08:00 appointment means 08:00 at that dock, not at
 * the carrier's office. The US Census geocoder returns coordinates and no time
 * zone, so the zone is chosen in the form from this short list rather than
 * guessed, and a wrong guess about an appointment is a missed appointment.
 */
export const US_TIMEZONES = [
  { zone: 'America/New_York', label: 'Eastern — New York' },
  { zone: 'America/Chicago', label: 'Central — Chicago' },
  { zone: 'America/Denver', label: 'Mountain — Denver' },
  { zone: 'America/Phoenix', label: 'Mountain, no DST — Phoenix' },
  { zone: 'America/Los_Angeles', label: 'Pacific — Los Angeles' },
  { zone: 'America/Anchorage', label: 'Alaska — Anchorage' },
  { zone: 'Pacific/Honolulu', label: 'Hawaii — Honolulu' },
] as const;

export type UsTimezone = (typeof US_TIMEZONES)[number]['zone'];

export function isUsTimezone(zone: string): zone is UsTimezone {
  return US_TIMEZONES.some((entry) => entry.zone === zone);
}

export function timezoneLabel(zone: string): string {
  return US_TIMEZONES.find((entry) => entry.zone === zone)?.label ?? zone;
}

/** Free time before detention starts, as the office says it out loud. */
export function detentionLabel(minutes: number): string {
  if (minutes === 0) return 'No free time';
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} free`;
  }
  if (minutes < 60) return `${minutes} min free`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min free`;
}

export const GEOCODE_STATES = ['pending', 'found', 'not_found', 'manual'] as const;
export type GeocodeState = (typeof GEOCODE_STATES)[number];

export type GeocodeLook = { label: string; tone: 'idle' | 'warning' | 'normal' };

/**
 * What to say about a facility's place on the map.
 *
 * "Not found" is a problem the office can fix by dragging a pin, so it is the
 * one that gets warning colour. Pending is merely a job that has not run yet.
 */
export function geocodeLook(state: GeocodeState, hasCoords: boolean): GeocodeLook {
  if (state === 'manual') return { label: 'Placed by hand', tone: 'idle' };
  if (state === 'found' && hasCoords) return { label: 'On the map', tone: 'idle' };
  if (state === 'not_found') return { label: 'Address not found', tone: 'warning' };
  // "Waiting to be placed" is true before the geocoding job exists and after
  // it does; "Looking it up" would be a small lie on every row until then.
  return { label: 'Waiting to be placed', tone: 'normal' };
}
