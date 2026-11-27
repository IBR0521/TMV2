import { describe, expect, it } from 'vitest';
import { dwellAt } from '@/domain/detention';

const arrived = '2026-11-30T14:00:00.000Z';

function at(hours: number, minutes = 0): string {
  return new Date(Date.parse(arrived) + hours * 3_600_000 + minutes * 60_000).toISOString();
}

describe('how long a truck sat', () => {
  it('is nothing to charge for inside the free time', () => {
    const dwell = dwellAt({ arrivedAt: arrived, departedAt: at(1, 30), freeMinutes: 120 });

    expect(dwell?.minutes).toBe(90);
    expect(dwell?.overMinutes).toBe(0);
    expect(dwell?.chargeable).toBe(false);
    expect(dwell?.words).toBe('1 h 30 min, inside 2 h free');
  });

  it('is chargeable past it, and says by how much', () => {
    const dwell = dwellAt({ arrivedAt: arrived, departedAt: at(3, 40), freeMinutes: 120 });

    expect(dwell?.minutes).toBe(220);
    expect(dwell?.overMinutes).toBe(100);
    expect(dwell?.chargeable).toBe(true);
    expect(dwell?.words).toBe('3 h 40 min, 1 h 40 min over 2 h free');
  });

  it('counts a dock with no free time from the first minute', () => {
    const dwell = dwellAt({ arrivedAt: arrived, departedAt: at(0, 20), freeMinutes: 0 });

    expect(dwell?.overMinutes).toBe(20);
    expect(dwell?.words).toBe('20 min, 20 min over no free time');
  });

  it('is exactly nothing on the free time to the minute', () => {
    const dwell = dwellAt({ arrivedAt: arrived, departedAt: at(2), freeMinutes: 120 });

    expect(dwell?.overMinutes).toBe(0);
    expect(dwell?.chargeable).toBe(false);
  });

  // Nothing is owed for a truck that is still sitting there: a charge raised
  // before anybody knows the figure is a charge somebody has to go and fix.
  it('is nothing at all while the truck is still at the dock', () => {
    expect(dwellAt({ arrivedAt: arrived, departedAt: null, freeMinutes: 120 })).toBeNull();
    expect(dwellAt({ arrivedAt: null, departedAt: at(2), freeMinutes: 120 })).toBeNull();
  });

  // A departure before the arrival is somebody's typo, not a negative wait.
  it('refuses times in the wrong order rather than inventing a credit', () => {
    expect(dwellAt({ arrivedAt: at(3), departedAt: arrived, freeMinutes: 120 })).toBeNull();
  });

  it('refuses something that is not a time', () => {
    expect(dwellAt({ arrivedAt: 'this morning', departedAt: at(2), freeMinutes: 120 })).toBeNull();
  });

  it('says hours plainly when they are whole', () => {
    expect(dwellAt({ arrivedAt: arrived, departedAt: at(5), freeMinutes: 60 })?.words).toBe(
      '5 h, 4 h over 1 h free',
    );
  });
});
