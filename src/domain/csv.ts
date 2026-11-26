/**
 * Reading a CSV the way a carrier's own export actually looks.
 *
 * Pure: no database, no network, no clock, and no file handling — it takes
 * text and gives back rows of strings.
 *
 * Written rather than installed because the awkward parts are few and known,
 * and because a parser nobody can read is a parser nobody can fix:
 *  - a field may be quoted, and a quoted field may contain commas and line
 *    breaks (addresses do, constantly);
 *  - a quote inside a quoted field is doubled ("O""Brien Trucking");
 *  - files come with CRLF line endings from Windows and a byte-order mark
 *    from Excel, neither of which is part of anybody's data;
 *  - the last line may or may not end with a newline.
 */
export type Sheet = {
  headings: string[];
  /** One object per row, keyed by the heading above each column. */
  rows: Record<string, string>[];
};

/** Every field, row by row, with nothing interpreted. */
export function parseCsv(text: string): string[][] {
  // Excel writes a byte-order mark; it is not part of the first heading.
  const input = text.replace(/^﻿/, '');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let index = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };

  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (index < input.length) {
    const char = input[index];

    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
      index += 1;
      continue;
    }

    if (char === ',') {
      endField();
      index += 1;
      continue;
    }

    if (char === '\r') {
      // CRLF and a lone CR both end the line.
      endRow();
      index += input[index + 1] === '\n' ? 2 : 1;
      continue;
    }

    if (char === '\n') {
      endRow();
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  // Whatever is in hand at the end is a last row, unless the file ended on a
  // newline and there is nothing in hand.
  if (field !== '' || row.length > 0) endRow();

  return rows;
}

/** True for a row that is entirely empty — the blank lines every sheet has. */
function isBlank(row: string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

/**
 * A sheet as the import wants it: the first non-blank row is the headings,
 * everything after it is data.
 *
 * A column with no heading is given one ("Column 3"), so a stray column can be
 * seen and ignored on the preview rather than silently swallowing its cells.
 */
export function toSheet(rows: string[][]): Sheet {
  const meaningful = rows.filter((row) => !isBlank(row));
  const first = meaningful[0];
  if (first === undefined) return { headings: [], rows: [] };

  const headings = first.map((heading, column) => {
    const trimmed = heading.trim();
    return trimmed === '' ? `Column ${column + 1}` : trimmed;
  });

  const body = meaningful.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headings.forEach((heading, column) => {
      record[heading] = (row[column] ?? '').trim();
    });
    return record;
  });

  return { headings, rows: body };
}

export function readCsv(text: string): Sheet {
  return toSheet(parseCsv(text));
}
