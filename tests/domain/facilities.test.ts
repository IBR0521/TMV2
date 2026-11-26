import { describe, expect, it } from 'vitest';
import {
  detentionLabel,
  geocodeLook,
  isUsTimezone,
  timezoneLabel,
  US_TIMEZONES,
} from '@/domain/facilities';

describe('the time zone list', () => {
  it('covers the zones a US carrier delivers into', () => {
    expect(US_TIMEZONES).toHaveLength(7);
    expect(isUsTimezone('America/Chicago')).toBe(true);
    expect(isUsTimezone('America/Phoenix')).toBe(true);
  });

  it('refuses a zone that is not one of them', () => {
    expect(isUsTimezone('Europe/Tashkent')).toBe(false);
    expect(isUsTimezone('')).toBe(false);
  });

  it('names a zone the way a dispatcher would', () => {
    expect(timezoneLabel('America/New_York')).toBe('Eastern — New York');
  });

  it('shows an unknown zone as itself rather than hiding it', () => {
    expect(timezoneLabel('Asia/Tokyo')).toBe('Asia/Tokyo');
  });
});

describe('free time before detention', () => {
  it('is said in hours when it divides', () => {
    expect(detentionLabel(120)).toBe('2 hours free');
    expect(detentionLabel(60)).toBe('1 hour free');
  });

  it('is said in minutes under the hour', () => {
    expect(detentionLabel(45)).toBe('45 min free');
  });

  it('is said in both when it is neither', () => {
    expect(detentionLabel(90)).toBe('1 h 30 min free');
  });

  it('says plainly when there is none', () => {
    expect(detentionLabel(0)).toBe('No free time');
  });
});

describe('where a facility is on the map', () => {
  it('is quiet once it is found', () => {
    expect(geocodeLook('found', true)).toEqual({ label: 'On the map', tone: 'idle' });
  });

  it('is quiet when a person placed the pin', () => {
    expect(geocodeLook('manual', true)).toEqual({ label: 'Placed by hand', tone: 'idle' });
  });

  // A miss is something the office can fix, so it is the one that gets colour.
  it('is a warning only when the address could not be found', () => {
    expect(geocodeLook('not_found', false).tone).toBe('warning');
    expect(geocodeLook('pending', false).tone).toBe('normal');
  });

  it('does not claim a facility is on the map without coordinates', () => {
    expect(geocodeLook('found', false).label).toBe('Waiting to be placed');
  });

  it('does not claim to be looking when nothing is looking yet', () => {
    expect(geocodeLook('pending', false).label).toBe('Waiting to be placed');
  });
});
