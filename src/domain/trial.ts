/**
 * The 14-day trial (docs/spec/spec.md, Decisions). The current time is always
 * an argument: the same inputs give the same answer in a test and on screen.
 *
 * Pure: no database, no network, no clock.
 */
export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left, never negative. 0 means the trial ends today or has ended. */
export function trialDaysLeft(trialEndsAt: Date | string | null, now: Date): number {
  if (trialEndsAt === null) return 0;
  const ends = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
  if (Number.isNaN(ends.getTime())) return 0;
  const ms = ends.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

export function trialHasEnded(trialEndsAt: Date | string | null, now: Date): boolean {
  return trialDaysLeft(trialEndsAt, now) === 0;
}

/** Wording for the sidebar, in the house style: facts, no sentences. */
export function trialLabel(trialEndsAt: Date | string | null, now: Date): string {
  const days = trialDaysLeft(trialEndsAt, now);
  if (days === 0) return 'Trial ended';
  if (days === 1) return 'Trial · 1 day left';
  return `Trial · ${days} days left`;
}
