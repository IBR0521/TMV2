import { describe, expect, it } from 'vitest';
import {
  bestCandidate,
  distanceMiles,
  type DriverCandidate,
  rankCandidates,
} from '@/domain/dispatch';

/**
 * Who should take this load. The suggestion is only as good as it is
 * explainable, so every test here also checks what it says about itself.
 */
const DALLAS = { lat: 32.7767, lng: -96.797 };
const HOUSTON = { lat: 29.7604, lng: -95.3698 };
const ATLANTA = { lat: 33.749, lng: -84.388 };

function driver(over: Partial<DriverCandidate> = {}): DriverCandidate {
  return {
    driverId: 'd1',
    driverName: 'Ana Reyes',
    truckId: 't1',
    truckUnit: '117',
    free: true,
    lastDropAt: DALLAS,
    daysSinceHome: 2,
    ...over,
  };
}

describe('straight-line distance', () => {
  it('is about right between cities a dispatcher knows', () => {
    // Dallas to Houston is about 225 miles as the crow flies.
    expect(distanceMiles(DALLAS, HOUSTON)).toBeGreaterThan(200);
    expect(distanceMiles(DALLAS, HOUSTON)).toBeLessThan(250);
  });

  it('is zero for the same place, and symmetric', () => {
    expect(distanceMiles(DALLAS, DALLAS)).toBe(0);
    expect(distanceMiles(DALLAS, ATLANTA)).toBe(distanceMiles(ATLANTA, DALLAS));
  });
});

describe('ranking', () => {
  it('will not suggest a driver who is already busy', () => {
    const ranked = rankCandidates([driver({ free: false })], DALLAS);
    expect(ranked).toEqual([]);
  });

  // A truck is not optional: there is nothing to dispatch without one.
  it('will not suggest a driver with no truck', () => {
    expect(rankCandidates([driver({ truckId: null })], DALLAS)).toEqual([]);
  });

  it('prefers the driver who is closer to the pickup', () => {
    const near = driver({ driverId: 'near', driverName: 'Near', lastDropAt: DALLAS });
    const far = driver({ driverId: 'far', driverName: 'Far', lastDropAt: ATLANTA });

    const ranked = rankCandidates([far, near], DALLAS);

    expect(ranked[0]?.candidate.driverId).toBe('near');
    expect(ranked[0]?.because).toContain('already there');
    expect(ranked[1]?.because).toContain('mi away');
  });

  it('prefers the driver who has been out longer when they are equally close', () => {
    const fresh = driver({ driverId: 'fresh', driverName: 'Fresh', daysSinceHome: 1 });
    const weary = driver({ driverId: 'weary', driverName: 'Weary', daysSinceHome: 12 });

    const ranked = rankCandidates([fresh, weary], DALLAS);

    expect(ranked[0]?.candidate.driverId).toBe('weary');
    expect(ranked[0]?.because).toContain('due home');
  });

  // Not knowing where somebody is should not make them the best candidate,
  // and should not rule them out either.
  it('treats an unknown position as middling, and says so', () => {
    const unknown = driver({ driverId: 'unknown', driverName: 'Unknown', lastDropAt: null });
    const here = driver({ driverId: 'here', driverName: 'Here', lastDropAt: DALLAS });
    const miles = driver({ driverId: 'miles', driverName: 'Miles', lastDropAt: ATLANTA });

    const ranked = rankCandidates([unknown, here, miles], DALLAS);

    expect(ranked.map((row) => row.candidate.driverId)).toEqual(['here', 'unknown', 'miles']);
    expect(ranked[1]?.because).toContain('position unknown');
    expect(ranked[1]?.deadheadMiles).toBeNull();
  });

  it('copes with a load whose pickup has no coordinates yet', () => {
    const ranked = rankCandidates([driver()], null);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.deadheadMiles).toBeNull();
  });

  // The same facts must always suggest the same person: a dispatcher who
  // refreshes and sees a different name stops trusting the suggestion.
  it('breaks a tie the same way every time', () => {
    const a = driver({ driverId: 'a', driverName: 'Abbott' });
    const b = driver({ driverId: 'b', driverName: 'Baines' });

    expect(rankCandidates([a, b], DALLAS)[0]?.candidate.driverId).toBe('a');
    expect(rankCandidates([b, a], DALLAS)[0]?.candidate.driverId).toBe('a');
  });

  it('suggests nobody when nobody can take it', () => {
    expect(bestCandidate([driver({ free: false })], DALLAS)).toBeNull();
    expect(bestCandidate([], DALLAS)).toBeNull();
  });

  it('suggests the top of the ranking', () => {
    const best = bestCandidate([driver({ driverName: 'Only' })], DALLAS);
    expect(best?.candidate.driverName).toBe('Only');
    expect(best?.score).toBeGreaterThan(0);
  });
});
