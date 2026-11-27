import { describe, expect, it } from 'vitest';
import { instantFromWallClock, wallClockOf } from '@/domain/time';

/**
 * The bug this module was written for: a dispatcher typed 08:00 for a Memphis
 * pickup and the load was saved as 21:00 the previous day, because the server
 * read the wall-clock string in its own zone. Every case here is a time
 * somebody would actually type.
 */
describe('a wall-clock time in a named zone', () => {
  it('means that time at that place, not on the server', () => {
    // 08:00 Central in winter is 14:00 UTC.
    expect(instantFromWallClock('2026-11-30T08:00', 'America/Chicago')).toBe(
      '2026-11-30T14:00:00.000Z',
    );
  });

  it('follows the zone, not a fixed offset', () => {
    // Eastern is one hour ahead of Central, so the same clock time is earlier.
    expect(instantFromWallClock('2026-11-30T08:00', 'America/New_York')).toBe(
      '2026-11-30T13:00:00.000Z',
    );
    expect(instantFromWallClock('2026-11-30T08:00', 'America/Los_Angeles')).toBe(
      '2026-11-30T16:00:00.000Z',
    );
  });

  // Phoenix does not change its clocks, which is exactly the sort of thing a
  // fixed offset gets wrong twice a year.
  it('knows Arizona does not move', () => {
    expect(instantFromWallClock('2026-07-15T08:00', 'America/Phoenix')).toBe(
      '2026-07-15T15:00:00.000Z',
    );
    expect(instantFromWallClock('2026-12-15T08:00', 'America/Phoenix')).toBe(
      '2026-12-15T15:00:00.000Z',
    );
  });

  it('knows Central does', () => {
    expect(instantFromWallClock('2026-07-15T08:00', 'America/Chicago')).toBe(
      '2026-07-15T13:00:00.000Z',
    );
    expect(instantFromWallClock('2026-12-15T08:00', 'America/Chicago')).toBe(
      '2026-12-15T14:00:00.000Z',
    );
  });

  it('takes seconds if they are there', () => {
    expect(instantFromWallClock('2026-11-30T08:30:45', 'America/Chicago')).toBe(
      '2026-11-30T14:30:45.000Z',
    );
  });

  it('is nothing at all when it is not a wall-clock time', () => {
    expect(instantFromWallClock('', 'America/Chicago')).toBeNull();
    expect(instantFromWallClock('tomorrow morning', 'America/Chicago')).toBeNull();
    expect(instantFromWallClock('2026-11-30', 'America/Chicago')).toBeNull();
    // An instant is not a wall-clock time: it already carries a zone.
    expect(instantFromWallClock('2026-11-30T14:00:00Z', 'America/Chicago')).toBeNull();
  });
});

describe('putting an appointment back in a form', () => {
  it('reads the clock on the wall at that facility', () => {
    expect(wallClockOf('2026-11-30T14:00:00.000Z', 'America/Chicago')).toBe('2026-11-30T08:00');
    expect(wallClockOf('2026-11-30T14:00:00.000Z', 'America/New_York')).toBe('2026-11-30T09:00');
  });

  it('comes back to where it started', () => {
    const typed = '2026-11-30T08:00';
    const instant = instantFromWallClock(typed, 'America/Chicago');
    expect(wallClockOf(instant ?? '', 'America/Chicago')).toBe(typed);
  });

  it('handles midnight without saying 24', () => {
    const instant = instantFromWallClock('2026-11-30T00:00', 'America/Chicago');
    expect(wallClockOf(instant ?? '', 'America/Chicago')).toBe('2026-11-30T00:00');
  });

  it('is nothing at all for something that is not an instant', () => {
    expect(wallClockOf('not a date', 'America/Chicago')).toBeNull();
  });
});
