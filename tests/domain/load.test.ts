import { describe, expect, it } from 'vitest';
import {
  canReach,
  estimateProfit,
  LOAD_STATUSES,
  type LoadFacts,
  type LoadStatus,
  moveTo,
  nextStep,
  nextStepLabel,
  parseMoneyToCents,
  rateCents,
} from '@/domain/load';

/**
 * The load state machine. docs/build-plan.md, phase 3 step 2: "the load state
 * machine with tests for every allowed and refused transition".
 *
 * So the first test is the whole 6 × 6 grid. Every pair is stated once, which
 * means a transition cannot be added, removed or quietly widened without this
 * file disagreeing.
 */
const ALLOWED: ReadonlyArray<[LoadStatus, LoadStatus]> = [
  ['draft', 'booked'],
  ['draft', 'cancelled'],
  ['booked', 'dispatched'],
  ['booked', 'cancelled'],
  ['dispatched', 'in_transit'],
  ['dispatched', 'booked'],
  ['dispatched', 'cancelled'],
  ['in_transit', 'delivered'],
];

/** A load with nothing wrong with it, so a refusal is about the move itself. */
function ready(over: Partial<LoadFacts> = {}): LoadFacts {
  return {
    status: 'draft',
    hasCustomer: true,
    pickups: 1,
    deliveries: 1,
    billableCents: 250_000,
    hasDriver: true,
    hasTruck: true,
    ...over,
  };
}

describe('every transition, allowed and refused', () => {
  for (const from of LOAD_STATUSES) {
    for (const to of LOAD_STATUSES) {
      const allowed = ALLOWED.some(([a, b]) => a === from && b === to);

      it(`${from} → ${to} is ${allowed ? 'allowed' : 'refused'}`, () => {
        expect(canReach(from, to)).toBe(allowed);
        expect(moveTo(ready({ status: from }), to).ok).toBe(allowed);
      });
    }
  }

  it('refuses a move to the state it is already in, in words', () => {
    const move = moveTo(ready({ status: 'booked' }), 'booked');
    expect(move.ok).toBe(false);
    expect(move.ok ? '' : move.because).toBe('This load is already booked.');
  });
});

describe('booking a draft', () => {
  it('needs a customer', () => {
    const move = moveTo(ready({ hasCustomer: false }), 'booked');
    expect(move.ok ? '' : move.because).toBe('Choose the customer before booking this load.');
  });

  it('needs a pickup', () => {
    const move = moveTo(ready({ pickups: 0 }), 'booked');
    expect(move.ok ? '' : move.because).toBe('A load needs a pickup before it can be booked.');
  });

  it('needs a delivery', () => {
    const move = moveTo(ready({ deliveries: 0 }), 'booked');
    expect(move.ok ? '' : move.because).toBe('A load needs a delivery before it can be booked.');
  });

  it('needs somebody to be paying for it', () => {
    const move = moveTo(ready({ billableCents: 0 }), 'booked');
    expect(move.ok ? '' : move.because).toBe(
      'Add what the customer is paying before booking this load.',
    );
  });

  it('stamps when it was booked', () => {
    const move = moveTo(ready(), 'booked');
    expect(move.ok && move.effects).toEqual([{ kind: 'stamp', field: 'booked_at' }]);
  });
});

describe('dispatching', () => {
  it('needs a driver', () => {
    const move = moveTo(ready({ status: 'booked', hasDriver: false }), 'dispatched');
    expect(move.ok ? '' : move.because).toBe('Assign a driver before dispatching this load.');
  });

  it('needs a truck', () => {
    const move = moveTo(ready({ status: 'booked', hasTruck: false }), 'dispatched');
    expect(move.ok ? '' : move.because).toBe('Assign a truck before dispatching this load.');
  });

  it('stamps when it went out', () => {
    const move = moveTo(ready({ status: 'booked' }), 'dispatched');
    expect(move.ok && move.effects).toEqual([{ kind: 'stamp', field: 'dispatched_at' }]);
  });
});

describe('unassigning', () => {
  // docs/spec/spec.md: "dispatched → booked means unassign".
  it('takes the driver and truck off the load', () => {
    const move = moveTo(ready({ status: 'dispatched' }), 'booked');
    expect(move.ok && move.effects).toEqual([{ kind: 'clear_assignment' }]);
  });
});

describe('cancelling', () => {
  it('costs the broker nothing before anyone was sent', () => {
    for (const status of ['draft', 'booked'] as const) {
      const move = moveTo(ready({ status }), 'cancelled');
      expect(move.ok && move.effects).toEqual([{ kind: 'stamp', field: 'cancelled_at' }]);
    }
  });

  // Truck ordered, not used: somebody was sent, so the broker owes for it.
  it('adds a TONU charge once the load was dispatched', () => {
    const move = moveTo(ready({ status: 'dispatched' }), 'cancelled');
    expect(move.ok && move.effects).toEqual([
      { kind: 'stamp', field: 'cancelled_at' },
      { kind: 'add_tonu_charge' },
    ]);
  });

  it('is refused once the load is rolling, and says why', () => {
    const move = moveTo(ready({ status: 'in_transit' }), 'cancelled');
    expect(move.ok ? '' : move.because).toBe('A load that is already rolling cannot be cancelled.');
  });
});

describe('a finished load', () => {
  it('cannot be changed', () => {
    expect(moveTo(ready({ status: 'delivered' }), 'booked').ok).toBe(false);
    expect(moveTo(ready({ status: 'cancelled' }), 'booked').ok).toBe(false);
  });

  it('says which kind of finished it is', () => {
    const delivered = moveTo(ready({ status: 'delivered' }), 'booked');
    const cancelled = moveTo(ready({ status: 'cancelled' }), 'booked');

    expect(delivered.ok ? '' : delivered.because).toBe('A delivered load cannot be changed.');
    expect(cancelled.ok ? '' : cancelled.because).toBe('A cancelled load cannot be changed.');
  });
});

describe('the next step a screen offers', () => {
  it('is the one forward move, in words', () => {
    expect(nextStepLabel('draft')).toBe('Book it');
    expect(nextStepLabel('booked')).toBe('Assign a driver');
    expect(nextStepLabel('dispatched')).toBe('Mark picked up');
    expect(nextStepLabel('in_transit')).toBe('Mark delivered');
  });

  it('is nothing at all once the load is finished', () => {
    expect(nextStep('delivered')).toBeNull();
    expect(nextStep('cancelled')).toBeNull();
    expect(nextStepLabel('delivered')).toBeNull();
  });
});

describe('the money on a load', () => {
  const charges = [
    { amountCents: 250_000, billCustomer: true, payDriver: false },
    { amountCents: 15_000, billCustomer: true, payDriver: false },
    // A lumper the broker reimburses and the driver is paid for.
    { amountCents: 12_500, billCustomer: true, payDriver: true },
    // A deduction the broker takes off the rate.
    { amountCents: -5_000, billCustomer: true, payDriver: false },
    // Something paid to the driver that nobody is billed for.
    { amountCents: 7_500, billCustomer: false, payDriver: true },
  ];

  it('is the sum of what the customer is billed, deductions included', () => {
    expect(rateCents(charges)).toBe(272_500);
  });

  it('counts nothing twice', () => {
    expect(rateCents([])).toBe(0);
  });

  it('estimates the profit from miles and the placeholder rates', () => {
    const estimate = estimateProfit({
      charges,
      miles: 790,
      driverPayCentsPerMile: 60,
      fuelCentsPerMile: 45,
    });

    expect(estimate.revenueCents).toBe(272_500);
    // 790 × 60 = 47,400, plus the 12,500 lumper and the 7,500 paid to them.
    expect(estimate.driverCents).toBe(67_400);
    expect(estimate.fuelCents).toBe(35_550);
    expect(estimate.profitCents).toBe(272_500 - 67_400 - 35_550);
  });

  // Dividing by no miles is how a dashboard ends up showing Infinity.
  it('says nothing per mile when there are no miles yet', () => {
    const estimate = estimateProfit({
      charges,
      miles: null,
      driverPayCentsPerMile: 60,
      fuelCentsPerMile: 45,
    });

    expect(estimate.perMileCents).toBeNull();
    expect(estimate.fuelCents).toBe(0);
  });

  it('can be negative, and says so rather than hiding it', () => {
    const estimate = estimateProfit({
      charges: [{ amountCents: 50_000, billCustomer: true, payDriver: false }],
      miles: 900,
      driverPayCentsPerMile: 60,
      fuelCentsPerMile: 45,
    });

    expect(estimate.profitCents).toBeLessThan(0);
  });
});

describe('reading money a person typed', () => {
  it('reads the ways a rate is written', () => {
    expect(parseMoneyToCents('2712')).toBe(271_200);
    expect(parseMoneyToCents('2712.50')).toBe(271_250);
    expect(parseMoneyToCents('2712.5')).toBe(271_250);
    expect(parseMoneyToCents('$2,712.50')).toBe(271_250);
    expect(parseMoneyToCents(' 2712 ')).toBe(271_200);
  });

  it('reads a deduction', () => {
    expect(parseMoneyToCents('-50')).toBe(-5_000);
    expect(parseMoneyToCents('-50.25')).toBe(-5_025);
  });

  // 0.1 + 0.2 is the oldest bug in accounting software.
  it('never goes through a float', () => {
    expect(parseMoneyToCents('0.10')).toBe(10);
    expect(parseMoneyToCents('0.20')).toBe(20);
    expect(parseMoneyToCents('1234567.89')).toBe(123_456_789);
  });

  it('is nothing at all when it is not money', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('about three thousand')).toBeNull();
    expect(parseMoneyToCents('2712.555')).toBeNull();
    expect(parseMoneyToCents('1.2.3')).toBeNull();
    expect(parseMoneyToCents('12-34')).toBeNull();
  });

  // Commas and spaces are punctuation, not meaning: there is no reading of
  // "2,712," or "2 712" that is not 2712, so a slip of the finger — or a
  // thousands separator typed as a space — is not worth a refusal.
  it('forgives a stray comma or a space between thousands', () => {
    expect(parseMoneyToCents('2,712,')).toBe(271_200);
    expect(parseMoneyToCents('2 712')).toBe(271_200);
  });

  // The one shape that could be misread is refused rather than guessed at.
  it('refuses a continental number instead of misreading it', () => {
    expect(parseMoneyToCents('2.712,50')).toBeNull();
  });
});
