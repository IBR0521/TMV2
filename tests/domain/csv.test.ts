import { describe, expect, it } from 'vitest';
import { parseCsv, readCsv, toSheet } from '@/domain/csv';

/**
 * Every case here came from what a carrier's own export actually looks like:
 * Windows line endings, Excel's byte-order mark, addresses with commas in
 * them, and a surname with an apostrophe that Excel quotes.
 */
describe('parsing the fields', () => {
  it('reads a plain file', () => {
    expect(parseCsv('Unit,VIN\n117,1FUJ')).toEqual([
      ['Unit', 'VIN'],
      ['117', '1FUJ'],
    ]);
  });

  it('reads Windows line endings', () => {
    expect(parseCsv('Unit,VIN\r\n117,1FUJ\r\n')).toEqual([
      ['Unit', 'VIN'],
      ['117', '1FUJ'],
    ]);
  });

  it('drops the byte-order mark Excel writes', () => {
    expect(parseCsv('﻿Unit,VIN\n117,1FUJ')[0]).toEqual(['Unit', 'VIN']);
  });

  it('keeps commas inside a quoted field', () => {
    expect(parseCsv('Name,Address\nNorthline,"4700 Sunbelt Drive, Dallas, TX"')).toEqual([
      ['Name', 'Address'],
      ['Northline', '4700 Sunbelt Drive, Dallas, TX'],
    ]);
  });

  it('keeps a line break inside a quoted field', () => {
    expect(parseCsv('Name,Notes\nGulf,"Reefer at 34F.\nNight receiving only."')).toEqual([
      ['Name', 'Notes'],
      ['Gulf', 'Reefer at 34F.\nNight receiving only.'],
    ]);
  });

  it('reads a doubled quote as one quote', () => {
    expect(parseCsv('Name\n"O""Brien Trucking"')).toEqual([['Name'], ['O"Brien Trucking']]);
  });

  it('keeps an empty field rather than losing the column', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('reads the last line whether or not it ends with a newline', () => {
    expect(parseCsv('a\n1')).toEqual([['a'], ['1']]);
    expect(parseCsv('a\n1\n')).toEqual([['a'], ['1']]);
  });

  it('reads nothing from nothing', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('turning it into a sheet', () => {
  it('takes the first row as the headings', () => {
    const sheet = readCsv('Unit #,VIN\n117,1FUJGBDV8CLBA1234\n104,');

    expect(sheet.headings).toEqual(['Unit #', 'VIN']);
    expect(sheet.rows).toEqual([
      { 'Unit #': '117', VIN: '1FUJGBDV8CLBA1234' },
      { 'Unit #': '104', VIN: '' },
    ]);
  });

  it('skips the blank lines every spreadsheet has', () => {
    const sheet = readCsv('\n\nUnit\n117\n\n104\n\n');

    expect(sheet.headings).toEqual(['Unit']);
    expect(sheet.rows).toEqual([{ Unit: '117' }, { Unit: '104' }]);
  });

  it('trims the cells, because people type spaces', () => {
    expect(readCsv('Unit\n  117  ').rows[0]).toEqual({ Unit: '117' });
  });

  // A nameless column is still a column: given a name, it can be seen on the
  // preview and ignored on purpose rather than swallowing its cells quietly.
  it('names a column that has no heading', () => {
    const sheet = readCsv('Unit,,Plate\n117,junk,TX 1');

    expect(sheet.headings).toEqual(['Unit', 'Column 2', 'Plate']);
    expect(sheet.rows[0]?.['Column 2']).toBe('junk');
  });

  it('copes with a short row', () => {
    expect(readCsv('a,b,c\n1').rows[0]).toEqual({ a: '1', b: '', c: '' });
  });

  it('is empty for an empty file', () => {
    expect(toSheet([])).toEqual({ headings: [], rows: [] });
  });
});
