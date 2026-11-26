import { describe, expect, it } from 'vitest';
import { parseCarrier, titleCase } from '@/server/services/fmcsa';

/**
 * Reading one row of FMCSA's Company Census File.
 *
 * The rows below are the shape the real dataset returns (checked against
 * data.transportation.gov on 26 November 2026), capitals and all. Socrata
 * leaves a field out entirely when it is null, which is the case worth being
 * careful about.
 */
const row = {
  dot_number: '296119',
  legal_name: 'A & B DUMP TRUCK SERVICE',
  phy_street: 'RD 4 -BOX 327',
  phy_city: 'SEWELL',
  phy_state: 'NJ',
  phy_zip: '08080',
  status_code: 'I',
};

describe('putting federal capitals back into words', () => {
  it('reads a shouted name as a name', () => {
    expect(titleCase('A & B DUMP TRUCK SERVICE')).toBe('A & B Dump Truck Service');
  });

  it('keeps ordinals lower case', () => {
    expect(titleCase('1200 65TH STREET')).toBe('1200 65th Street');
    expect(titleCase('403 3RD AVE')).toBe('403 3rd Ave');
  });
});

describe('one carrier record', () => {
  it('reads the name, the address and whether it is active', () => {
    const carrier = parseCarrier(row);

    expect(carrier).toEqual({
      dotNumber: '296119',
      legalName: 'A & B Dump Truck Service',
      dbaName: null,
      address: 'Rd 4 -Box 327, Sewell, NJ 08080',
      active: false,
    });
  });

  it('knows an active carrier from an inactive one', () => {
    expect(parseCarrier({ ...row, status_code: 'A' })?.active).toBe(true);
  });

  it('reads a trading name when there is one', () => {
    expect(parseCarrier({ ...row, dba_name: 'AB HAULING' })?.dbaName).toBe('Ab Hauling');
  });

  // The file says UNKNOWN where it has no street. Repeating that back as if it
  // were an address would be worse than saying nothing.
  it('does not repeat "UNKNOWN" back as a street', () => {
    expect(parseCarrier({ ...row, phy_street: 'UNKNOWN' })?.address).toBe('Sewell, NJ 08080');
  });

  it('copes with the fields Socrata leaves out', () => {
    const sparse = { dot_number: '80321', legal_name: 'OLIVER TIRE & RUBBER CO' };
    expect(parseCarrier(sparse)).toEqual({
      dotNumber: '80321',
      legalName: 'Oliver Tire & Rubber Co',
      dbaName: null,
      address: '',
      active: false,
    });
  });

  it('is nothing at all when the row is not a carrier', () => {
    expect(parseCarrier(null)).toBeNull();
    expect(parseCarrier({})).toBeNull();
    expect(parseCarrier({ dot_number: '1' })).toBeNull();
    expect(parseCarrier({ legal_name: 'NO NUMBER' })).toBeNull();
  });
});
