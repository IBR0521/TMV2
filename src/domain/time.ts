/**
 * Wall-clock times and the instants they mean.
 *
 * Pure: no database, no network, no clock of its own.
 *
 * An appointment is typed as a wall-clock time — "2026-11-30T08:00" — and it
 * means eight in the morning *at the dock*. Three zones are in play and only
 * one of them is right:
 *
 *   * the browser's, which is wherever the dispatcher happens to be;
 *   * the server's, which is wherever it is hosted;
 *   * the facility's, which is the one the appointment is actually in.
 *
 * `new Date("2026-11-30T08:00")` reads the string in whichever zone the
 * machine is set to, so a server in Tashkent turned a Memphis 08:00 into
 * 21:00 the previous day. That is the bug this module exists to make
 * impossible: the zone is always named, and the conversion is tested.
 */

/** How far the zone is from UTC, in minutes, at that moment. */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const get = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  const asIfUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );

  return (asIfUtc - at.getTime()) / 60_000;
}

const WALL_CLOCK = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

/**
 * The instant a wall-clock time means in a given zone, as an ISO string.
 *
 * Returns null for anything that is not a wall-clock time, so a bad value
 * becomes a refusal rather than a wrong appointment.
 *
 * The offset is applied twice. The first pass uses the offset at the wrong
 * instant, which is only ever wrong across a daylight-saving boundary; the
 * second pass uses the offset at the answer and settles it.
 */
export function instantFromWallClock(wallClock: string, timeZone: string): string | null {
  const text = wallClock.trim();
  if (!WALL_CLOCK.test(text)) return null;

  const naive = Date.parse(`${text.length === 16 ? `${text}:00` : text}Z`);
  if (Number.isNaN(naive)) return null;

  let guess = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  guess = new Date(naive - offsetMinutes(guess, timeZone) * 60_000);

  return guess.toISOString();
}

/**
 * The other direction: what a clock on the wall of that facility would read.
 * Useful for putting an existing appointment back into a form.
 */
export function wallClockOf(instant: string, timeZone: string): string | null {
  const at = new Date(instant);
  if (Number.isNaN(at.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);

  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? '00';

  // en-CA gives 24-hour time, but midnight comes back as "24" in some engines.
  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}
