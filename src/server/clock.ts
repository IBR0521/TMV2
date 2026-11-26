/**
 * The only place the server asks what day it is.
 *
 * src/domain takes dates as arguments and never reads a clock, so that its
 * tests state a date and get one answer. The services are where the clock
 * lives, and it is read in the carrier's own time zone: a medical card that
 * expires on the 30th expires on the 30th at their office, not in UTC.
 */

/** Today as YYYY-MM-DD in the given IANA zone. */
export function todayInZone(timezone: string): string {
  // en-CA formats as YYYY-MM-DD, which is what a date column wants.
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    // An unknown zone should not take a screen down; UTC is close enough to
    // show a chip, and the zone is validated where it is entered.
    return new Date().toISOString().slice(0, 10);
  }
}
