import { describe, expect, it } from 'vitest';
import {
  complianceKindFits,
  complianceKindsFor,
  daysUntil,
  expiryOf,
  expiryThreshold,
  formatPhone,
  normalisePhone,
  normaliseUnitNumber,
  normaliseVin,
} from '@/domain/fleet';

/**
 * The fleet rules the screens and the daily expiry job both read. Dates are
 * passed in, never taken from the clock, so every expectation here is exact.
 */
describe('daysUntil', () => {
  it('counts whole days', () => {
    expect(daysUntil('2026-12-01', '2026-11-26')).toBe(5);
  });

  it('is zero on the day itself', () => {
    expect(daysUntil('2026-11-26', '2026-11-26')).toBe(0);
  });

  it('goes negative once the date has passed', () => {
    expect(daysUntil('2026-11-20', '2026-11-26')).toBe(-6);
  });

  it('counts across a month and a leap day without drifting', () => {
    expect(daysUntil('2028-03-01', '2028-02-28')).toBe(2);
  });

  it('refuses anything that is not a date', () => {
    expect(() => daysUntil('next Tuesday', '2026-11-26')).toThrow(/YYYY-MM-DD/);
  });
});

describe('a document’s expiry', () => {
  it('is nothing at all when the document does not expire', () => {
    expect(expiryOf(null, '2026-11-26')).toBeNull();
  });

  it('is critical inside a week, including the seventh day', () => {
    expect(expiryOf('2026-12-03', '2026-11-26')?.state).toBe('critical');
    expect(expiryOf('2026-11-26', '2026-11-26')?.state).toBe('critical');
  });

  it('is soon from the eighth day to the thirtieth', () => {
    expect(expiryOf('2026-12-04', '2026-11-26')?.state).toBe('soon');
    expect(expiryOf('2026-12-26', '2026-11-26')?.state).toBe('soon');
  });

  it('is fine beyond a month', () => {
    expect(expiryOf('2026-12-27', '2026-11-26')?.state).toBe('ok');
  });

  it('is expired the day after', () => {
    const expiry = expiryOf('2026-11-25', '2026-11-26');
    expect(expiry?.state).toBe('expired');
    expect(expiry?.daysLeft).toBe(-1);
  });

  it('says it in words, not in codes', () => {
    expect(expiryOf('2026-11-26', '2026-11-26')?.label).toBe('Expires today');
    expect(expiryOf('2026-11-27', '2026-11-26')?.label).toBe('1 day left');
    expect(expiryOf('2026-12-03', '2026-11-26')?.label).toBe('7 days left');
    expect(expiryOf('2026-11-25', '2026-11-26')?.label).toBe('Expired yesterday');
    expect(expiryOf('2026-11-19', '2026-11-26')?.label).toBe('Expired 7 days ago');
    expect(expiryOf('2027-06-30', '2026-11-26')?.label).toBe('Valid');
  });
});

describe('the alert threshold', () => {
  it('is nothing more than a month out', () => {
    expect(expiryThreshold(31)).toBeNull();
  });

  it('is the wide window on the thirtieth day', () => {
    expect(expiryThreshold(30)).toBe(30);
  });

  it('is the tight window on the seventh', () => {
    expect(expiryThreshold(7)).toBe(7);
  });

  // The job runs daily, but a worker that was down for three days must not
  // skip the alert it should have sent.
  it('still reports the tight window when the day was missed', () => {
    expect(expiryThreshold(4)).toBe(7);
    expect(expiryThreshold(29)).toBe(30);
  });

  it('keeps reporting once the document has expired', () => {
    expect(expiryThreshold(-2)).toBe(7);
  });
});

describe('what paperwork belongs to what', () => {
  it('gives a driver a CDL and a medical card', () => {
    expect(complianceKindsFor('driver')).toEqual(['cdl', 'medical']);
  });

  it('gives a truck its registration, insurance and inspection', () => {
    expect(complianceKindsFor('truck')).toEqual(['registration', 'insurance', 'inspection']);
  });

  it('knows a truck has no medical card', () => {
    expect(complianceKindFits('medical', 'truck')).toBe(false);
    expect(complianceKindFits('medical', 'driver')).toBe(true);
  });
});

describe('a VIN', () => {
  it('is stored upper case with the punctuation people add', () => {
    expect(normaliseVin('1fujgbdv8clba1234')).toBe('1FUJGBDV8CLBA1234');
    expect(normaliseVin(' 1FUJ-GBDV8CLBA1234 ')).toBe('1FUJGBDV8CLBA1234');
  });

  it('is seventeen characters, no more and no fewer', () => {
    expect(normaliseVin('1FUJGBDV8CLBA123')).toBeNull();
    expect(normaliseVin('1FUJGBDV8CLBA12345')).toBeNull();
  });

  // I, O and Q are not VIN characters: they were left out so they could not be
  // read as 1 and 0.
  it('rejects the letters a VIN never contains', () => {
    expect(normaliseVin('1FUJGBDV8CLBI1234')).toBeNull();
    expect(normaliseVin('1FUJGBDV8CLBO1234')).toBeNull();
    expect(normaliseVin('1FUJGBDV8CLBQ1234')).toBeNull();
  });
});

describe('a unit number', () => {
  it('keeps what was typed, tidily', () => {
    expect(normaliseUnitNumber('  117 ')).toBe('117');
    expect(normaliseUnitNumber('T  450')).toBe('T 450');
  });
});

describe('a phone number', () => {
  it('is stored as ten digits, however it was typed', () => {
    expect(normalisePhone('(214) 555-0142')).toBe('2145550142');
    expect(normalisePhone('214.555.0142')).toBe('2145550142');
    expect(normalisePhone('+1 214 555 0142')).toBe('2145550142');
  });

  it('is not a number that cannot be dialled', () => {
    expect(normalisePhone('555-0142')).toBeNull();
    expect(normalisePhone('1145550142')).toBeNull();
    expect(normalisePhone('')).toBeNull();
  });

  it('reads back the way a person writes it', () => {
    expect(formatPhone('2145550142')).toBe('(214) 555-0142');
  });
});
