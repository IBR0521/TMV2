/**
 * The fleet: what a driver, truck or trailer can be, and when its paperwork
 * needs attention.
 *
 * Pure: no database, no network, no clock. Callers pass today's date in, which
 * is what lets the expiry tests state a date and get a known answer.
 *
 * docs/spec/spec.md, Data model (Fleet group).
 */
export const DRIVER_TYPES = ['company', 'owner_operator'] as const;
export type DriverType = (typeof DRIVER_TYPES)[number];

export const DRIVER_STATUSES = ['active', 'inactive'] as const;
export type DriverStatus = (typeof DRIVER_STATUSES)[number];

export const UNIT_STATUSES = ['active', 'inactive', 'in_shop'] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const TRAILER_TYPES = ['dry_van', 'reefer', 'flatbed'] as const;
export type TrailerType = (typeof TRAILER_TYPES)[number];

export const COMPLIANCE_KINDS = [
  'cdl',
  'medical',
  'registration',
  'insurance',
  'inspection',
] as const;
export type ComplianceKind = (typeof COMPLIANCE_KINDS)[number];

const DRIVER_TYPE_LABELS: Record<DriverType, string> = {
  company: 'Company driver',
  owner_operator: 'Owner-operator',
};

const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  in_shop: 'In shop',
};

const TRAILER_TYPE_LABELS: Record<TrailerType, string> = {
  dry_van: 'Dry van',
  reefer: 'Reefer',
  flatbed: 'Flatbed',
};

const COMPLIANCE_KIND_LABELS: Record<ComplianceKind, string> = {
  cdl: 'CDL',
  medical: 'Medical card',
  registration: 'Registration',
  insurance: 'Insurance',
  inspection: 'Annual inspection',
};

export function driverTypeLabel(type: DriverType): string {
  return DRIVER_TYPE_LABELS[type];
}

export function driverStatusLabel(status: DriverStatus): string {
  return DRIVER_STATUS_LABELS[status];
}

export function unitStatusLabel(status: UnitStatus): string {
  return UNIT_STATUS_LABELS[status];
}

export function trailerTypeLabel(type: TrailerType): string {
  return TRAILER_TYPE_LABELS[type];
}

export function complianceKindLabel(kind: ComplianceKind): string {
  return COMPLIANCE_KIND_LABELS[kind];
}

/** Which subjects a kind of paperwork belongs to, so a form offers only those. */
const COMPLIANCE_SUBJECTS: Record<ComplianceKind, readonly ComplianceSubject[]> = {
  cdl: ['driver'],
  medical: ['driver'],
  registration: ['truck', 'trailer'],
  insurance: ['truck', 'trailer'],
  inspection: ['truck', 'trailer'],
};

export const COMPLIANCE_SUBJECTS_LIST = ['driver', 'truck', 'trailer'] as const;
export type ComplianceSubject = (typeof COMPLIANCE_SUBJECTS_LIST)[number];

export function complianceKindsFor(subject: ComplianceSubject): ComplianceKind[] {
  return COMPLIANCE_KINDS.filter((kind) => COMPLIANCE_SUBJECTS[kind].includes(subject));
}

export function complianceKindFits(kind: ComplianceKind, subject: ComplianceSubject): boolean {
  return COMPLIANCE_SUBJECTS[kind].includes(subject);
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------
/**
 * Whole days from `today` to `date`, both plain YYYY-MM-DD. Negative once the
 * date has passed.
 *
 * Both are read as UTC midnight on purpose: a date column carries no time and
 * no zone, so reading it in the machine's local zone would make a document
 * expire a day early west of Greenwich.
 */
export function daysUntil(date: string, today: string): number {
  const then = Date.parse(`${date}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) {
    throw new Error(`daysUntil: expected two YYYY-MM-DD dates, got "${date}" and "${today}"`);
  }
  return Math.round((then - now) / 86_400_000);
}

export const EXPIRY_STATES = ['expired', 'critical', 'soon', 'ok'] as const;
export type ExpiryState = (typeof EXPIRY_STATES)[number];

/** The two windows the compliance.expiring rule alerts in, widest last. */
export const EXPIRY_THRESHOLDS = [7, 30] as const;
export type ExpiryThreshold = (typeof EXPIRY_THRESHOLDS)[number];

export type Expiry = {
  daysLeft: number;
  state: ExpiryState;
  /** What to say on a chip: "Expired 3 days ago", "7 days left", "Valid". */
  label: string;
};

/**
 * How close a document is to expiring.
 *
 * critical is inside a week, soon is inside a month. The screens colour on
 * this and the daily rule alerts on it, so one function decides both and they
 * cannot disagree.
 */
export function expiryOf(expiresOn: string | null, today: string): Expiry | null {
  if (expiresOn === null) return null;

  const daysLeft = daysUntil(expiresOn, today);
  const state: ExpiryState =
    daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'critical' : daysLeft <= 30 ? 'soon' : 'ok';

  return { daysLeft, state, label: expiryLabel(daysLeft) };
}

function expiryLabel(daysLeft: number): string {
  if (daysLeft < 0) {
    const days = Math.abs(daysLeft);
    return days === 1 ? 'Expired yesterday' : `Expired ${days} days ago`;
  }
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return '1 day left';
  if (daysLeft <= 30) return `${daysLeft} days left`;
  return 'Valid';
}

/**
 * The threshold a document has crossed, or null if it is not due yet.
 *
 * Crossed, not landed on: if the daily job does not run for three days, a
 * document that was 8 days out is now 5 and must still produce the 7-day
 * alert. The caller dedupes on (document, threshold), so the tighter window
 * produces a second card and the same window never produces two.
 */
export function expiryThreshold(daysLeft: number): ExpiryThreshold | null {
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 30) return 30;
  return null;
}

// ---------------------------------------------------------------------------
// Tidying what people type
// ---------------------------------------------------------------------------
/**
 * A VIN as it should be stored: upper case, no spaces or hyphens.
 *
 * Returns null for anything that is not a VIN, so a bad cell in a spreadsheet
 * becomes a reported problem rather than a stored lie. I, O and Q are not VIN
 * characters — they were left out to stop them being read as 1 and 0.
 */
export function normaliseVin(raw: string): string | null {
  const vin = raw.replace(/[\s-]/g, '').toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? vin : null;
}

/** A unit number as it should be stored: trimmed, inner runs of space collapsed. */
export function normaliseUnitNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * A US phone number as ten digits, or null.
 *
 * A leading 1 is dropped: carriers type their numbers both ways and the same
 * phone should not be stored twice.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{9}$/.test(ten) ? ten : null;
}

/** Ten stored digits as a human reads them: (214) 555-0142. */
export function formatPhone(ten: string): string {
  if (!/^\d{10}$/.test(ten)) return ten;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
