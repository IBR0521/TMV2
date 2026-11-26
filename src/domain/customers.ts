/**
 * Customers: brokers and shippers, and how each one is billed.
 *
 * Pure: no database, no network, no clock.
 *
 * docs/spec/spec.md, Data model (Customers group). Nothing here computes
 * whether an invoice is overdue — that is read from due_on in phase 5 and is
 * never stored.
 */
export const CUSTOMER_TYPES = ['broker', 'shipper'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const SEND_MODES = ['email', 'own_portal'] as const;
export type SendMode = (typeof SEND_MODES)[number];

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  broker: 'Broker',
  shipper: 'Shipper',
};

const SEND_MODE_LABELS: Record<SendMode, string> = {
  email: 'We email the invoice',
  own_portal: 'They want it in their portal',
};

export function customerTypeLabel(type: CustomerType): string {
  return CUSTOMER_TYPE_LABELS[type];
}

export function sendModeLabel(mode: SendMode): string {
  return SEND_MODE_LABELS[mode];
}

/** The widest terms a carrier will accept; anything beyond is a typo. */
export const MAX_PAYMENT_TERMS_DAYS = 180;

/** Net terms as the industry writes them. */
export function paymentTermsLabel(days: number): string {
  if (days === 0) return 'Due on receipt';
  return `Net ${days}`;
}

export function isPaymentTerms(days: number): boolean {
  return Number.isInteger(days) && days >= 0 && days <= MAX_PAYMENT_TERMS_DAYS;
}

/**
 * An MC (docket) number as it should be stored: digits only.
 *
 * Carriers write it "MC-883102", "mc 883102" or "883102" and mean the same
 * thing. Returns null for anything that is not a docket number, so an import
 * reports a bad cell instead of storing it.
 */
export function normaliseMcNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return /^\d{4,8}$/.test(digits) ? digits : null;
}

/** The same, for a USDOT number. */
export function normaliseDotNumber(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return /^\d{1,8}$/.test(digits) ? digits : null;
}

/**
 * A billing address that can actually be sent to, lower-cased and trimmed.
 *
 * Not a full RFC check: it rejects what would certainly bounce and leaves the
 * rest to Resend in phase 5.
 */
export function normaliseEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email) ? email : null;
}
