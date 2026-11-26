import { describe, expect, it } from 'vitest';
import { truckLimitProblem } from '@/domain/plan';

/**
 * The one rule in phase 2 that can stop a carrier working, so it is tested
 * without a database rather than only through a screen.
 */
describe('the truck limit', () => {
  it('does not apply during the trial, however many trucks are imported', () => {
    expect(
      truckLimitProblem({
        status: 'trialing',
        truckLimit: 5,
        activeTrucks: 40,
        alreadyActive: false,
      }),
    ).toBeNull();
  });

  it('allows a truck up to the limit', () => {
    expect(
      truckLimitProblem({ status: 'active', truckLimit: 5, activeTrucks: 4, alreadyActive: false }),
    ).toBeNull();
  });

  it('stops the one past the limit, and says what to do about it', () => {
    const problem = truckLimitProblem({
      status: 'active',
      truckLimit: 5,
      activeTrucks: 5,
      alreadyActive: false,
    });

    expect(problem).toContain('covers 5 active trucks');
    expect(problem).toContain('Settings');
  });

  // Editing the truck that sits on the limit must still save.
  it('does not count a truck that is already active', () => {
    expect(
      truckLimitProblem({ status: 'active', truckLimit: 5, activeTrucks: 5, alreadyActive: true }),
    ).toBeNull();
  });

  it('counts in the singular when the plan covers one truck', () => {
    expect(
      truckLimitProblem({ status: 'active', truckLimit: 1, activeTrucks: 1, alreadyActive: false }),
    ).toContain('1 active truck.');
  });

  it('applies once the plan is past due or cancelled', () => {
    for (const status of ['past_due', 'cancelled'] as const) {
      expect(
        truckLimitProblem({ status, truckLimit: 5, activeTrucks: 5, alreadyActive: false }),
      ).not.toBeNull();
    }
  });
});
