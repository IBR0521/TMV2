/**
 * Who should take this load.
 *
 * Pure: no database, no network, no clock. The worker gathers the facts and
 * this decides, so the ranking can be argued with in a test rather than
 * guessed at from a screen.
 *
 * docs/build-plan.md, phase 3 step 6: rank on whether they are free on the
 * pickup date, how far their last delivery is from the pickup, and whether
 * they are due home. Three things, weighed openly — a dispatcher who disagrees
 * with the suggestion should be able to see why it was made.
 *
 * What this deliberately is not: an optimiser. It suggests one driver and the
 * dispatcher decides. Being roughly right and explainable beats being
 * precisely right and inscrutable, because the dispatcher knows things this
 * does not — who is reliable on a reefer, who hates that dock.
 */
export type Place = { lat: number; lng: number };

export type DriverCandidate = {
  driverId: string;
  driverName: string;
  truckId: string | null;
  truckUnit: string | null;
  /** False when they already have a load that overlaps the pickup day. */
  free: boolean;
  /** Where their last delivery leaves them, if we know it. */
  lastDropAt: Place | null;
  /** Days since they were last at home. Null when nobody has recorded one. */
  daysSinceHome: number | null;
};

export type Ranked = {
  candidate: DriverCandidate;
  score: number;
  /** Why this one, in the words a dispatcher would use. */
  because: string;
  deadheadMiles: number | null;
};

const EARTH_MILES = 3958.8;

/**
 * Straight-line miles between two points.
 *
 * Straight line, not road miles: the routing server arrives in phase 7, and
 * for choosing between two drivers the crow's distance is enough. Everywhere
 * it is shown it is called deadhead, approximately.
 */
export function distanceMiles(from: Place, to: Place): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;

  return Math.round(EARTH_MILES * 2 * Math.asin(Math.sqrt(a)));
}

/** A driver this far out is as good as any other: the difference is noise. */
const FAR = 600;
/** Past this many days away, going home matters more than the extra deadhead. */
const LONG_AWAY = 10;

/**
 * Rank the candidates, best first.
 *
 * The score is a plain sum, and each part is named in `because`, so the
 * ranking can be explained on screen and argued with in a review:
 *   * not free at all is disqualifying — there is no score that makes a
 *     double-booked truck a good idea;
 *   * closer to the pickup is better, on a straight line;
 *   * longer since home is better, because the load may take them that way
 *     and because the alternative is a driver who quits.
 */
export function rankCandidates(candidates: readonly DriverCandidate[], pickup: Place | null): Ranked[] {
  const ranked = candidates
    .filter((candidate) => candidate.free && candidate.truckId !== null)
    .map((candidate): Ranked => {
      const deadheadMiles =
        pickup === null || candidate.lastDropAt === null
          ? null
          : distanceMiles(candidate.lastDropAt, pickup);

      // Closeness is worth up to 60 points, and an unknown position scores as
      // if it were middling: not knowing where somebody is should not make
      // them the best candidate, nor rule them out.
      const closeness =
        deadheadMiles === null ? 30 : Math.max(0, 60 - (deadheadMiles / FAR) * 60);

      // Time away is worth up to 40. Nobody recorded is zero, not a guess.
      const away = candidate.daysSinceHome ?? 0;
      const homeTime = Math.min(away / LONG_AWAY, 1) * 40;

      const reasons: string[] = [];
      if (deadheadMiles === null) reasons.push('position unknown');
      else if (deadheadMiles === 0) reasons.push('already there');
      else reasons.push(`${deadheadMiles} mi away`);

      if (away >= LONG_AWAY) reasons.push(`${away} days out, due home`);
      else if (away > 0) reasons.push(`${away} days out`);

      return {
        candidate,
        score: Math.round(closeness + homeTime),
        because: reasons.join(' · '),
        deadheadMiles,
      };
    });

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // A stable tie-break, so the same facts always suggest the same person
    // and a dispatcher is not shown a different answer on a refresh.
    return a.candidate.driverName.localeCompare(b.candidate.driverName);
  });
}

/** The one to suggest, or nobody. */
export function bestCandidate(
  candidates: readonly DriverCandidate[],
  pickup: Place | null,
): Ranked | null {
  return rankCandidates(candidates, pickup)[0] ?? null;
}
