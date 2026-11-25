import { describe, expect, it } from 'vitest';
import { TRIAL_DAYS, trialDaysLeft, trialHasEnded, trialLabel } from '@/domain/trial';

const now = new Date('2026-11-25T12:00:00Z');

describe('the 14-day trial', () => {
  it('is 14 days', () => {
    expect(TRIAL_DAYS).toBe(14);
  });

  it('counts whole days left', () => {
    expect(trialDaysLeft('2026-12-09T12:00:00Z', now)).toBe(14);
    expect(trialDaysLeft('2026-11-26T12:00:00Z', now)).toBe(1);
    expect(trialDaysLeft('2026-11-26T08:00:00Z', now)).toBe(1);
  });

  it('never goes negative, and treats nothing on record as ended', () => {
    expect(trialDaysLeft('2026-11-01T12:00:00Z', now)).toBe(0);
    expect(trialDaysLeft(null, now)).toBe(0);
    expect(trialDaysLeft('not a date', now)).toBe(0);
    expect(trialHasEnded('2026-11-24T12:00:00Z', now)).toBe(true);
  });

  it('says it in the house style', () => {
    expect(trialLabel('2026-12-05T12:00:00Z', now)).toBe('Trial · 10 days left');
    expect(trialLabel('2026-11-26T12:00:00Z', now)).toBe('Trial · 1 day left');
    expect(trialLabel('2026-11-20T12:00:00Z', now)).toBe('Trial ended');
  });
});
