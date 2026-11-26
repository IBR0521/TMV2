/**
 * What the plan allows. Pure: no database, no network, no clock.
 *
 * CLAUDE.md rule 6: the subscriptions row is the only source of the truck
 * limit. The service reads that row and counts the trucks; the decision itself
 * lives here, where it can be tested without a database — it is the one rule
 * in phase 2 that can stop a carrier working, so it should not be buried in a
 * query.
 */
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';

export type TruckLimitCheck = {
  status: PlanStatus;
  /** Active trucks the plan covers. */
  truckLimit: number;
  /** Active trucks on record right now. */
  activeTrucks: number;
  /** True when the truck being saved is already one of those counted. */
  alreadyActive: boolean;
};

/**
 * Why this truck cannot be made active, or null if it can.
 *
 * During the trial there is no limit at all: a carrier importing their fleet
 * on day one must not be stopped halfway, and they have not paid for a tier
 * yet. A truck that is already active does not count twice, so editing the
 * odometer of the truck that sits on the limit still saves.
 */
export function truckLimitProblem(check: TruckLimitCheck): string | null {
  if (check.status === 'trialing') return null;
  if (check.alreadyActive) return null;

  if (check.activeTrucks + 1 > check.truckLimit) {
    return (
      `Your plan covers ${check.truckLimit} active ${check.truckLimit === 1 ? 'truck' : 'trucks'}. ` +
      'Set another truck inactive, or add trucks to the plan in Settings.'
    );
  }

  return null;
}
