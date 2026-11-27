/**
 * Detention: what a facility owes for keeping a truck waiting.
 *
 * Pure: no database, no network, no clock. Both times are passed in, which is
 * what lets the awkward cases — a truck that left before it arrived, a dock
 * with no free time at all — be stated in a test rather than discovered.
 *
 * docs/spec/spec.md, Event catalog — stop.departed: "Dwell over free time
 * becomes a detention charge."
 */
export type Dwell = {
  /** Minutes between arriving and leaving. */
  minutes: number;
  /** Minutes beyond the facility's free time. Zero when inside it. */
  overMinutes: number;
  /** True when there is something to charge for. */
  chargeable: boolean;
  /** "3 h 40 m, 1 h 40 m over 2 hours free" — the words that go on the card. */
  words: string;
};

function spell(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/**
 * How long a truck sat, and how much of that is chargeable.
 *
 * Returns null when the stop has not finished — nothing is owed for a truck
 * that is still at the dock, and guessing would put a charge on a load before
 * anybody knows the figure.
 *
 * A departure before the arrival is a typo, not a negative wait: it returns
 * null rather than a nonsense charge, and the screen that took the times
 * refuses the pair anyway.
 */
export function dwellAt(args: {
  arrivedAt: string | null;
  departedAt: string | null;
  freeMinutes: number;
}): Dwell | null {
  if (args.arrivedAt === null || args.departedAt === null) return null;

  const arrived = Date.parse(args.arrivedAt);
  const departed = Date.parse(args.departedAt);
  if (Number.isNaN(arrived) || Number.isNaN(departed)) return null;
  if (departed < arrived) return null;

  const minutes = Math.round((departed - arrived) / 60_000);
  const free = Math.max(0, args.freeMinutes);
  const overMinutes = Math.max(0, minutes - free);

  const freeWords = free === 0 ? 'no free time' : `${spell(free)} free`;
  const words =
    overMinutes === 0
      ? `${spell(minutes)}, inside ${freeWords}`
      : `${spell(minutes)}, ${spell(overMinutes)} over ${freeWords}`;

  return { minutes, overMinutes, chargeable: overMinutes > 0, words };
}
