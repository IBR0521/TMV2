/**
 * Reading a carrier's own spreadsheet: which column is which, and what each
 * cell means.
 *
 * Pure: no database, no network, no clock, and no file parsing. A CSV or XLSX
 * is turned into headings and rows of strings elsewhere; everything that
 * decides meaning happens here, where it can be tested a row at a time.
 *
 * docs/build-plan.md, phase 2 step 5: "column matching with a preview; the
 * company's column choices are remembered". The remembered choices come back
 * in as `remembered` and win over any guess, because a carrier who corrected
 * us once should not have to correct us again.
 */
import { normaliseEmail, normaliseMcNumber } from './customers';
import { normalisePhone, normaliseUnitNumber, normaliseVin } from './fleet';

export const IMPORT_KINDS = ['trucks', 'drivers', 'customers'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export type CellValue = string | number;

type Parsed = { ok: true; value: CellValue } | { ok: false; message: string };

type FieldSpec = {
  /** The column it fills in the database. */
  field: string;
  /** What the preview calls it. */
  label: string;
  required?: boolean;
  /** Headings seen in real carrier spreadsheets, matched loosely. */
  aliases: readonly string[];
  parse: (raw: string) => Parsed;
};

// ---------------------------------------------------------------------------
// Cell parsers
// ---------------------------------------------------------------------------
const text = (max: number) =>
  (raw: string): Parsed => {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (value === '') return { ok: false, message: 'is empty' };
    if (value.length > max) return { ok: false, message: `is longer than ${max} characters` };
    return { ok: true, value };
  };

const wholeNumber = (min: number, max: number) =>
  (raw: string): Parsed => {
    // Spreadsheets hand back "1,234", "1234.0" and " 1234 " for the same cell.
    const cleaned = raw.trim().replace(/,/g, '');
    const value = Number(cleaned);
    if (cleaned === '' || !Number.isFinite(value)) return { ok: false, message: 'is not a number' };
    if (!Number.isInteger(value)) return { ok: false, message: 'is not a whole number' };
    if (value < min || value > max) {
      return { ok: false, message: `is outside ${min} to ${max}` };
    }
    return { ok: true, value };
  };

/** An enum cell, matched on the loose form so "Owner Operator" and "o/o" land. */
const oneOf = (options: Record<string, string>, what: string) =>
  (raw: string): Parsed => {
    const key = loosen(raw);
    const value = options[key];
    return value === undefined ? { ok: false, message: `is not a ${what}` } : { ok: true, value };
  };

const viaNormaliser = (normalise: (raw: string) => string | null, message: string) =>
  (raw: string): Parsed => {
    const value = normalise(raw);
    return value === null ? { ok: false, message } : { ok: true, value };
  };

// ---------------------------------------------------------------------------
// What each kind of import can fill
// ---------------------------------------------------------------------------
const FIELDS: Record<ImportKind, readonly FieldSpec[]> = {
  trucks: [
    {
      field: 'unit_number',
      label: 'Unit number',
      required: true,
      aliases: ['Unit #', 'Unit', 'Unit No', 'Unit Number', 'Truck #', 'Truck', 'Truck Number'],
      parse: (raw) => {
        const value = normaliseUnitNumber(raw);
        return value === '' ? { ok: false, message: 'is empty' } : { ok: true, value };
      },
    },
    {
      field: 'vin',
      label: 'VIN',
      aliases: ['VIN', 'VIN #', 'Vin Number', 'Serial', 'Serial Number'],
      parse: viaNormaliser(normaliseVin, 'is not a 17-character VIN'),
    },
    {
      field: 'plate',
      label: 'Plate',
      aliases: ['Plate', 'Plate #', 'License Plate', 'Tag', 'Tag #'],
      parse: text(32),
    },
    {
      field: 'odometer_miles',
      label: 'Odometer',
      aliases: ['Odometer', 'Miles', 'Odometer Miles', 'Mileage'],
      parse: wholeNumber(0, 3_000_000),
    },
  ],
  drivers: [
    {
      field: 'name',
      label: 'Name',
      required: true,
      aliases: ['Name', 'Driver', 'Driver Name', 'Full Name', 'Employee'],
      parse: text(120),
    },
    {
      field: 'phone',
      label: 'Phone',
      aliases: ['Phone', 'Phone #', 'Phone Number', 'Cell', 'Cell Phone', 'Mobile'],
      parse: viaNormaliser(normalisePhone, 'is not a US phone number'),
    },
    {
      field: 'type',
      label: 'Type',
      aliases: ['Type', 'Driver Type', 'Employment', 'Company Or Owner'],
      parse: oneOf(
        {
          company: 'company',
          companydriver: 'company',
          employee: 'company',
          w2: 'company',
          owneroperator: 'owner_operator',
          owner: 'owner_operator',
          oo: 'owner_operator',
          contractor: 'owner_operator',
          '1099': 'owner_operator',
        },
        'driver type',
      ),
    },
    {
      field: 'home_location',
      label: 'Home',
      aliases: ['Home', 'Home Base', 'Home Location', 'Domicile', 'City', 'Home City'],
      parse: text(120),
    },
  ],
  customers: [
    {
      field: 'name',
      label: 'Name',
      required: true,
      aliases: ['Name', 'Customer', 'Customer Name', 'Company', 'Company Name', 'Broker'],
      parse: text(160),
    },
    {
      field: 'type',
      label: 'Type',
      aliases: ['Type', 'Customer Type', 'Kind'],
      parse: oneOf(
        { broker: 'broker', brokerage: 'broker', shipper: 'shipper', direct: 'shipper' },
        'customer type',
      ),
    },
    {
      field: 'mc_number',
      label: 'MC number',
      aliases: ['MC', 'MC #', 'MC Number', 'Docket', 'Docket Number'],
      parse: viaNormaliser(normaliseMcNumber, 'is not an MC number'),
    },
    {
      field: 'billing_email',
      label: 'Billing email',
      aliases: ['Email', 'Billing Email', 'Invoice Email', 'AP Email', 'Accounts Payable'],
      parse: viaNormaliser(normaliseEmail, 'is not an email address'),
    },
    {
      field: 'payment_terms_days',
      label: 'Terms',
      aliases: ['Terms', 'Payment Terms', 'Net', 'Net Days', 'Days'],
      parse: (raw) => {
        // "Net 30" and "30 days" both mean 30.
        const digits = raw.replace(/\D/g, '');
        return digits === ''
          ? { ok: false, message: 'is not a number of days' }
          : wholeNumber(0, 180)(digits);
      },
    },
  ],
};

export function fieldsFor(kind: ImportKind): readonly FieldSpec[] {
  return FIELDS[kind];
}

export function requiredFieldsFor(kind: ImportKind): string[] {
  return FIELDS[kind].filter((spec) => spec.required === true).map((spec) => spec.field);
}

export function fieldLabel(kind: ImportKind, field: string): string {
  return FIELDS[kind].find((spec) => spec.field === field)?.label ?? field;
}

// ---------------------------------------------------------------------------
// Matching the headings
// ---------------------------------------------------------------------------
/** A heading reduced to what matters: "Unit #" and "unit_number" both become "unitnumber". */
export function loosen(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export type ColumnMatch = {
  /** Heading in their file to field in ours. Headings we could not place are left out. */
  mapping: Record<string, string>;
  /** Required fields no column filled: the import cannot run until these are chosen. */
  missing: string[];
  /** Headings we ignored, shown in the preview so a carrier can point at the right one. */
  unused: string[];
};

/**
 * Work out which column is which.
 *
 * Order of authority: what this company chose last time, then an alias match.
 * A field is filled by at most one column, and the first heading that claims
 * it wins — a sheet with both "Phone" and "Cell" uses "Phone" and lists
 * "Cell" as unused, which the preview shows and the carrier can change.
 */
export function matchColumns(
  headings: readonly string[],
  kind: ImportKind,
  remembered: Record<string, string> = {},
): ColumnMatch {
  const specs = FIELDS[kind];
  const byAlias = new Map<string, string>();
  for (const spec of specs) {
    byAlias.set(loosen(spec.field), spec.field);
    for (const alias of spec.aliases) byAlias.set(loosen(alias), spec.field);
  }

  const known = new Set(specs.map((spec) => spec.field));
  const rememberedByLoose = new Map(
    Object.entries(remembered)
      .filter(([, field]) => known.has(field))
      .map(([heading, field]) => [loosen(heading), field]),
  );

  const mapping: Record<string, string> = {};
  const taken = new Set<string>();
  const unused: string[] = [];

  for (const heading of headings) {
    const loose = loosen(heading);
    const field = rememberedByLoose.get(loose) ?? byAlias.get(loose);
    if (field === undefined || taken.has(field)) {
      unused.push(heading);
      continue;
    }
    mapping[heading] = field;
    taken.add(field);
  }

  const missing = requiredFieldsFor(kind).filter((field) => !taken.has(field));
  return { mapping, missing, unused };
}

/** What to store so the next import of this kind matches on its own. */
export function rememberMapping(mapping: Record<string, string>): Record<string, string> {
  return { ...mapping };
}

// ---------------------------------------------------------------------------
// Reading the rows
// ---------------------------------------------------------------------------
export type RowProblem = { field: string; label: string; message: string };

export type ParsedRow = {
  values: Record<string, CellValue>;
  problems: RowProblem[];
};

/**
 * Turn one row of strings into the values we would store, plus whatever is
 * wrong with it.
 *
 * A blank optional cell is simply absent — carriers leave half the sheet
 * empty and that is not an error. A blank required cell is a problem, and so
 * is a cell that cannot be read: the preview shows the row, the carrier fixes
 * the sheet or the mapping, and nothing is written until they accept it.
 */
export function parseRow(
  cells: Record<string, string>,
  mapping: Record<string, string>,
  kind: ImportKind,
): ParsedRow {
  const specs = FIELDS[kind];
  const values: Record<string, CellValue> = {};
  const problems: RowProblem[] = [];

  for (const [heading, field] of Object.entries(mapping)) {
    const spec = specs.find((candidate) => candidate.field === field);
    if (spec === undefined) continue;

    const raw = cells[heading] ?? '';
    if (raw.trim() === '') {
      if (spec.required === true) {
        problems.push({ field, label: spec.label, message: 'is empty' });
      }
      continue;
    }

    const parsed = spec.parse(raw);
    if (parsed.ok) {
      values[field] = parsed.value;
    } else {
      problems.push({ field, label: spec.label, message: parsed.message });
    }
  }

  for (const field of requiredFieldsFor(kind)) {
    const filled = field in values;
    const alreadyReported = problems.some((problem) => problem.field === field);
    if (!filled && !alreadyReported) {
      problems.push({ field, label: fieldLabel(kind, field), message: 'has no column' });
    }
  }

  return { values, problems };
}

/** A row is importable when nothing is wrong with it. */
export function isImportable(row: ParsedRow): boolean {
  return row.problems.length === 0;
}
