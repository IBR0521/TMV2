import { describe, expect, it } from 'vitest';
import {
  isImportable,
  matchColumns,
  parseRow,
  requiredFieldsFor,
} from '@/domain/spreadsheet';

/**
 * The import has to survive a real carrier's spreadsheet: headings nobody
 * agreed on, half-empty columns, "Net 30" where a number belongs. Nothing is
 * written until the preview is accepted, so the job here is to be right about
 * what each cell means and honest about what it cannot read.
 */
describe('matching the columns of a truck sheet', () => {
  it('places the headings carriers actually use', () => {
    const match = matchColumns(['Unit #', 'VIN', 'Plate', 'Odometer'], 'trucks');

    expect(match.mapping).toEqual({
      'Unit #': 'unit_number',
      VIN: 'vin',
      Plate: 'plate',
      Odometer: 'odometer_miles',
    });
    expect(match.missing).toEqual([]);
    expect(match.unused).toEqual([]);
  });

  it('does not care about case, spacing or punctuation', () => {
    const match = matchColumns(['  truck_number ', 'vin #'], 'trucks');

    expect(match.mapping).toEqual({ '  truck_number ': 'unit_number', 'vin #': 'vin' });
  });

  it('says which required column is missing instead of guessing', () => {
    const match = matchColumns(['VIN', 'Plate'], 'trucks');

    expect(match.missing).toEqual(['unit_number']);
    expect(match.mapping).not.toHaveProperty('unit_number');
  });

  it('takes the first column that claims a field and lists the other as unused', () => {
    const match = matchColumns(['Name', 'Phone', 'Cell'], 'drivers');

    expect(match.mapping).toEqual({ Name: 'name', Phone: 'phone' });
    expect(match.unused).toEqual(['Cell']);
  });

  it('ignores columns that are none of our business', () => {
    const match = matchColumns(['Unit #', 'Insurance Agent', 'Notes'], 'trucks');

    expect(match.mapping).toEqual({ 'Unit #': 'unit_number' });
    expect(match.unused).toEqual(['Insurance Agent', 'Notes']);
  });
});

describe('what the company chose last time', () => {
  it('wins over our own guess', () => {
    const match = matchColumns(['Unit #', 'Tag'], 'trucks', { 'Unit #': 'plate', Tag: 'unit_number' });

    expect(match.mapping).toEqual({ 'Unit #': 'plate', Tag: 'unit_number' });
    expect(match.missing).toEqual([]);
  });

  it('is ignored where it names a field this import does not have', () => {
    const match = matchColumns(['Unit #'], 'trucks', { 'Unit #': 'favourite_colour' });

    expect(match.mapping).toEqual({ 'Unit #': 'unit_number' });
  });

  it('still matches when the heading was written differently this time', () => {
    const match = matchColumns(['TAG'], 'trucks', { Tag: 'unit_number' });

    expect(match.mapping).toEqual({ TAG: 'unit_number' });
  });
});

describe('reading a truck row', () => {
  const mapping = { 'Unit #': 'unit_number', VIN: 'vin', Odometer: 'odometer_miles' };

  it('reads a clean row', () => {
    const row = parseRow(
      { 'Unit #': ' 117 ', VIN: '1fujgbdv8clba1234', Odometer: '412,980' },
      mapping,
      'trucks',
    );

    expect(row.values).toEqual({
      unit_number: '117',
      vin: '1FUJGBDV8CLBA1234',
      odometer_miles: 412_980,
    });
    expect(isImportable(row)).toBe(true);
  });

  it('leaves an empty optional cell out, which is not a problem', () => {
    const row = parseRow({ 'Unit #': '118', VIN: '', Odometer: '' }, mapping, 'trucks');

    expect(row.values).toEqual({ unit_number: '118' });
    expect(isImportable(row)).toBe(true);
  });

  it('names the column and says what is wrong with it', () => {
    const row = parseRow({ 'Unit #': '119', VIN: 'NOT-A-VIN' }, mapping, 'trucks');

    expect(row.problems).toEqual([
      { field: 'vin', label: 'VIN', message: 'is not a 17-character VIN' },
    ]);
    expect(isImportable(row)).toBe(false);
  });

  it('reports an empty required cell', () => {
    const row = parseRow({ 'Unit #': '   ', VIN: '1FUJGBDV8CLBA1234' }, mapping, 'trucks');

    expect(row.problems).toEqual([
      { field: 'unit_number', label: 'Unit number', message: 'is empty' },
    ]);
  });

  it('reports a required field that no column fills', () => {
    const row = parseRow({ VIN: '1FUJGBDV8CLBA1234' }, { VIN: 'vin' }, 'trucks');

    expect(row.problems).toEqual([
      { field: 'unit_number', label: 'Unit number', message: 'has no column' },
    ]);
  });

  it('will not take a fractional odometer as a whole number', () => {
    const row = parseRow({ 'Unit #': '120', Odometer: '412980.4' }, mapping, 'trucks');

    expect(row.problems).toEqual([
      { field: 'odometer_miles', label: 'Odometer', message: 'is not a whole number' },
    ]);
  });
});

describe('reading a driver row', () => {
  const mapping = { Driver: 'name', Cell: 'phone', Type: 'type' };

  it('understands the ways a carrier writes owner-operator', () => {
    for (const written of ['Owner Operator', 'owner-operator', 'O/O', '1099']) {
      const row = parseRow({ Driver: 'Luis Ortega', Type: written }, mapping, 'drivers');
      expect(row.values.type).toBe('owner_operator');
    }
  });

  it('understands the ways a carrier writes company driver', () => {
    for (const written of ['Company', 'company driver', 'W2', 'Employee']) {
      const row = parseRow({ Driver: 'Dee Baker', Type: written }, mapping, 'drivers');
      expect(row.values.type).toBe('company');
    }
  });

  it('tidies the phone number on the way in', () => {
    const row = parseRow({ Driver: 'Ana Reyes', Cell: '+1 (214) 555-0142' }, mapping, 'drivers');

    expect(row.values.phone).toBe('2145550142');
  });

  it('says which driver type it could not read', () => {
    const row = parseRow({ Driver: 'Ray Kim', Type: 'lease purchase' }, mapping, 'drivers');

    expect(row.problems).toEqual([
      { field: 'type', label: 'Type', message: 'is not a driver type' },
    ]);
  });
});

describe('reading a customer row', () => {
  const mapping = { Customer: 'name', Terms: 'payment_terms_days', 'AP Email': 'billing_email' };

  it('reads terms whether they are a number or a phrase', () => {
    expect(parseRow({ Customer: 'Northline', Terms: 'Net 30' }, mapping, 'customers').values)
      .toEqual({ name: 'Northline', payment_terms_days: 30 });
    expect(parseRow({ Customer: 'Northline', Terms: '45 days' }, mapping, 'customers').values)
      .toEqual({ name: 'Northline', payment_terms_days: 45 });
  });

  it('lower-cases the billing address', () => {
    const row = parseRow(
      { Customer: 'Gulf Coast', 'AP Email': ' AP@GulfCoast.COM ' },
      mapping,
      'customers',
    );

    expect(row.values.billing_email).toBe('ap@gulfcoast.com');
  });
});

describe('the required fields', () => {
  it('are the few a row cannot do without', () => {
    expect(requiredFieldsFor('trucks')).toEqual(['unit_number']);
    expect(requiredFieldsFor('drivers')).toEqual(['name']);
    expect(requiredFieldsFor('customers')).toEqual(['name']);
  });
});
