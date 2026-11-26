/**
 * The load state machine, and the money on a load.
 *
 * Pure: no database, no network, no clock. Every transition in the product
 * goes through `moveTo`, so there is one place that decides what a load may
 * become and what happens when it does — and one place to read when the
 * answer is surprising.
 *
 * docs/spec/spec.md, State machines:
 *   draft → booked → dispatched → in_transit → delivered. Cancelled is
 *   reachable from draft, booked and dispatched; a load cancelled after
 *   dispatch gets a TONU charge. dispatched → booked means unassign.
 */
export const LOAD_STATUSES = [
  'draft',
  'booked',
  'dispatched',
  'in_transit',
  'delivered',
  'cancelled',
] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export const CHARGE_KINDS = [
  'linehaul',
  'fuel_surcharge',
  'detention',
  'lumper',
  'layover',
  'tonu',
  'other',
] as const;

export type ChargeKind = (typeof CHARGE_KINDS)[number];

const CHARGE_LABELS: Record<ChargeKind, string> = {
  linehaul: 'Linehaul',
  fuel_surcharge: 'Fuel surcharge',
  detention: 'Detention',
  lumper: 'Lumper',
  layover: 'Layover',
  tonu: 'Truck ordered, not used',
  other: 'Other',
};

export function chargeKindLabel(kind: ChargeKind): string {
  return CHARGE_LABELS[kind];
}

const LABELS: Record<LoadStatus, string> = {
  draft: 'Draft',
  booked: 'Booked',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function loadStatusLabel(status: LoadStatus): string {
  return LABELS[status];
}

/** Where a load can go from where it is. Everything else is refused. */
const ALLOWED: Record<LoadStatus, readonly LoadStatus[]> = {
  draft: ['booked', 'cancelled'],
  booked: ['dispatched', 'cancelled'],
  // Back to booked is how a load is unassigned.
  dispatched: ['in_transit', 'booked', 'cancelled'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canReach(from: LoadStatus, to: LoadStatus): boolean {
  return ALLOWED[from].includes(to);
}

/** The one forward step a screen offers as its primary button, if there is one. */
export function nextStep(status: LoadStatus): LoadStatus | null {
  const forward: Partial<Record<LoadStatus, LoadStatus>> = {
    draft: 'booked',
    booked: 'dispatched',
    dispatched: 'in_transit',
    in_transit: 'delivered',
  };
  return forward[status] ?? null;
}

export function nextStepLabel(status: LoadStatus): string | null {
  const step = nextStep(status);
  if (step === null) return null;
  return {
    booked: 'Book it',
    dispatched: 'Assign a driver',
    in_transit: 'Mark picked up',
    delivered: 'Mark delivered',
  }[step as 'booked' | 'dispatched' | 'in_transit' | 'delivered'];
}

// ---------------------------------------------------------------------------
// Moving
// ---------------------------------------------------------------------------
/** What the machine needs to know about a load to decide. */
export type LoadFacts = {
  status: LoadStatus;
  hasCustomer: boolean;
  pickups: number;
  deliveries: number;
  /** The sum of the charges billed to the customer, in cents. */
  billableCents: number;
  hasDriver: boolean;
  hasTruck: boolean;
};

/**
 * What the caller must do besides changing the status. Returned rather than
 * done, because this module touches nothing — the service applies them.
 */
export type LoadEffect =
  | { kind: 'stamp'; field: 'booked_at' | 'dispatched_at' | 'delivered_at' | 'cancelled_at' }
  | { kind: 'clear_assignment' }
  | { kind: 'add_tonu_charge' };

export type Move =
  | { ok: false; because: string }
  | { ok: true; status: LoadStatus; effects: LoadEffect[] };

function refuse(because: string): Move {
  return { ok: false, because };
}

/**
 * Move a load, or say why not.
 *
 * The refusals are specific on purpose. "That is not allowed" tells a
 * dispatcher nothing; "A load needs a delivery before it can be booked" tells
 * them what to do next.
 */
export function moveTo(facts: LoadFacts, to: LoadStatus): Move {
  const from = facts.status;

  if (from === to) return refuse(`This load is already ${LABELS[to].toLowerCase()}.`);

  if (!canReach(from, to)) {
    if (from === 'delivered') return refuse('A delivered load cannot be changed.');
    if (from === 'cancelled') return refuse('A cancelled load cannot be changed.');
    if (to === 'cancelled') {
      return refuse('A load that is already rolling cannot be cancelled.');
    }
    return refuse(`A ${LABELS[from].toLowerCase()} load cannot go straight to ${LABELS[to].toLowerCase()}.`);
  }

  if (to === 'booked' && from === 'draft') {
    if (!facts.hasCustomer) return refuse('Choose the customer before booking this load.');
    if (facts.pickups === 0) return refuse('A load needs a pickup before it can be booked.');
    if (facts.deliveries === 0) return refuse('A load needs a delivery before it can be booked.');
    if (facts.billableCents <= 0) {
      return refuse('Add what the customer is paying before booking this load.');
    }
    return { ok: true, status: to, effects: [{ kind: 'stamp', field: 'booked_at' }] };
  }

  // Unassigning: back to booked, and whoever was on it comes off.
  if (to === 'booked' && from === 'dispatched') {
    return { ok: true, status: to, effects: [{ kind: 'clear_assignment' }] };
  }

  if (to === 'dispatched') {
    if (!facts.hasDriver) return refuse('Assign a driver before dispatching this load.');
    if (!facts.hasTruck) return refuse('Assign a truck before dispatching this load.');
    return { ok: true, status: to, effects: [{ kind: 'stamp', field: 'dispatched_at' }] };
  }

  if (to === 'in_transit') return { ok: true, status: to, effects: [] };

  if (to === 'delivered') {
    return { ok: true, status: to, effects: [{ kind: 'stamp', field: 'delivered_at' }] };
  }

  if (to === 'cancelled') {
    const effects: LoadEffect[] = [{ kind: 'stamp', field: 'cancelled_at' }];
    // Truck ordered, not used: the carrier sent someone, so the broker owes
    // for it (docs/spec/spec.md, State machines).
    if (from === 'dispatched') effects.push({ kind: 'add_tonu_charge' });
    return { ok: true, status: to, effects };
  }

  /* c8 ignore next */
  return refuse('That change is not allowed.');
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------
export type Charge = {
  amountCents: number;
  billCustomer: boolean;
  payDriver: boolean;
};

/** What the customer owes: the sum of the lines billed to them. */
export function rateCents(charges: readonly Charge[]): number {
  return charges.reduce((total, charge) => (charge.billCustomer ? total + charge.amountCents : total), 0);
}

/** What the driver is owed from the charges themselves, before pay rules. */
export function driverChargesCents(charges: readonly Charge[]): number {
  return charges.reduce((total, charge) => (charge.payDriver ? total + charge.amountCents : total), 0);
}

export type ProfitEstimate = {
  revenueCents: number;
  driverCents: number;
  fuelCents: number;
  profitCents: number;
  /** Null when there are no miles yet: a guess per mile would be a lie. */
  perMileCents: number | null;
};

/**
 * What a load looks like it will make.
 *
 * An estimate, and called one everywhere it is shown. Real driver pay arrives
 * with settlements in phase 6 and real miles with the routing server in phase
 * 7; until then this is a rate per mile from company settings and a fuel
 * figure from the same place. Rounding is to the cent, away from zero, so the
 * estimate never flatters itself by a penny.
 */
export function estimateProfit(args: {
  charges: readonly Charge[];
  miles: number | null;
  driverPayCentsPerMile: number;
  fuelCentsPerMile: number;
}): ProfitEstimate {
  const revenueCents = rateCents(args.charges);
  const miles = args.miles ?? 0;

  const driverCents =
    Math.round(miles * args.driverPayCentsPerMile) + driverChargesCents(args.charges);
  const fuelCents = Math.round(miles * args.fuelCentsPerMile);
  const profitCents = revenueCents - driverCents - fuelCents;

  return {
    revenueCents,
    driverCents,
    fuelCents,
    profitCents,
    perMileCents: miles > 0 ? Math.round(revenueCents / miles) : null,
  };
}

/**
 * What a person typed, as integer cents, or null if it is not money.
 *
 * Money is integer cents and never a float (CLAUDE.md rule 2), so the string
 * is read digit by digit rather than through parseFloat: 0.1 + 0.2 is the
 * oldest bug in accounting software and there is no reason to invite it.
 * "$2,712.50", "2712.5" and "2712" all mean the same thing; "2712.555" does
 * not mean anything and says so.
 */
export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const negative = cleaned.startsWith('-');
  const [whole = '0', decimals = ''] = cleaned.replace('-', '').split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));

  return negative ? -cents : cents;
}
