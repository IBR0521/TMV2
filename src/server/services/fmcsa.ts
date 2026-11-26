import { ActionError } from '../errors';

/**
 * Looking a carrier up by its USDOT number.
 *
 * docs/spec/flows.md, step 2 of signup: "The owner types their DOT number;
 * name, address and MC number fill in from FMCSA's public carrier data."
 *
 * The build plan describes mirroring the whole Company Census File daily. The
 * file turned out to hold 4,535,564 rows — 2,248,264 of them active — which
 * is several hundred megabytes once indexed, more than the whole Supabase free
 * tier, and a heavy nightly job for the small VPS the worker runs on. The
 * owner chose on 26 November 2026 to look a DOT number up live instead: one
 * public request at the moment somebody types a number, no mirror to keep, and
 * an answer that is current rather than up to a day old.
 *
 * Two things this cannot do, both of them facts about the file rather than
 * choices:
 *  - **No MC number.** The census file carries no docket number at all; those
 *    live in a separate federal licensing file. MC stays a typed field.
 *  - **No company address field to fill.** The spec's data model gives
 *    companies a name, MC, DOT and time zone and no address, so the address
 *    is shown as confirmation that this is the right carrier, not stored.
 *
 * If the lookup fails for any reason the form falls back to manual entry,
 * which docs/spec/flows.md requires anyway ("DOT number not found or new
 * authority → manual company form, same screen").
 */
const ENDPOINT = 'https://data.transportation.gov/resource/az4n-8mr2.json';
const TIMEOUT_MS = 8_000;

export type CarrierRecord = {
  dotNumber: string;
  legalName: string;
  dbaName: string | null;
  /** One line, for showing back: "1200 65th Street, Oakland, CA 94662". */
  address: string;
  active: boolean;
};

/**
 * Federal data is stored in capitals. Shouting a carrier's own name back at
 * them reads like a database, so it is put back into words — except the state,
 * which is a code and stays a code.
 */
export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[A-Za-z]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
    // "65Th" and "3Rd" come out of that; put the ordinal suffix back down.
    .replace(/(\d)(St|Nd|Rd|Th)\b/g, (_, digit: string, suffix: string) => digit + suffix.toLowerCase());
}

function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * One row of the census file as the app wants it, or null if it is not a row
 * we can use. Pure, and exported so it can be tested against real response
 * bodies without the network.
 */
export function parseCarrier(raw: unknown): CarrierRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;

  const dotNumber = text(row, 'dot_number');
  const legalName = text(row, 'legal_name');
  if (dotNumber === '' || legalName === '') return null;

  const street = text(row, 'phy_street');
  const city = text(row, 'phy_city');
  const state = text(row, 'phy_state');
  const zip = text(row, 'phy_zip');

  // "UNKNOWN" is what the file says when it has no street, and repeating that
  // back as if it were an address would be worse than saying nothing.
  const parts = [
    street === '' || street.toUpperCase() === 'UNKNOWN' ? null : titleCase(street),
    city === '' ? null : titleCase(city),
    [state.toUpperCase(), zip].filter((part) => part !== '').join(' '),
  ].filter((part): part is string => part !== null && part !== '');

  const dba = text(row, 'dba_name');

  return {
    dotNumber,
    legalName: titleCase(legalName),
    dbaName: dba === '' ? null : titleCase(dba),
    address: parts.join(', '),
    active: text(row, 'status_code').toUpperCase() === 'A',
  };
}

/**
 * The carrier with this USDOT number, or null if the file has no such number.
 *
 * Throws only when the lookup itself could not be made, so the form can tell
 * the difference between "no such carrier" (type it in) and "we could not
 * ask" (try again, or type it in).
 */
export async function lookUpDot(dotNumber: string): Promise<CarrierRecord | null> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('dot_number', dotNumber);
  url.searchParams.set('$limit', '1');

  let body: unknown;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json', 'user-agent': 'TruckMates/2.0' },
    });

    if (!response.ok) {
      throw new ActionError(
        'The federal carrier lookup is not answering. Type the details in instead.',
      );
    }

    body = await response.json();
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError(
      'The federal carrier lookup could not be reached. Type the details in instead.',
    );
  }

  if (!Array.isArray(body) || body.length === 0) return null;
  return parseCarrier(body[0]);
}
