import { truckLimitProblem } from '@/domain/plan';
import {
  type ImportKind,
  isImportable,
  parseRow,
  type CellValue,
} from '@/domain/spreadsheet';
import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';
import { getEntitlements } from './entitlements';

/**
 * Importing a carrier's own spreadsheet of trucks, drivers or customers.
 *
 * The browser shows a preview, but the browser is not trusted: it sends the
 * raw cells and the mapping, and everything that decides meaning runs here,
 * through the same pure functions in src/domain/spreadsheet the preview used.
 * So what you saw is what you get, and a tampered payload gets no further than
 * a well-behaved one.
 *
 * Nothing is updated. A row whose unit number or name is already on the list
 * is skipped and said so, because a silent overwrite of a carrier's own
 * records is the worst thing an import can do.
 */
export const MAX_ROWS = 2_000;

export type RowProblem = { line: number; what: string };

export type ImportOutcome = {
  created: number;
  /** Rows that were already there, by unit number or name. */
  skipped: number;
  problems: RowProblem[];
};

export async function getMapping(ctx: Ctx, kind: ImportKind): Promise<Record<string, string>> {
  const { data, error } = await ctx.db
    .from('import_mappings')
    .select('columns')
    .eq('company_id', ctx.companyId)
    .eq('kind', kind)
    .maybeSingle();

  if (error) fail(error, 'The remembered columns could not be read.');
  if (data === null) return {};

  const columns = data.columns;
  if (typeof columns !== 'object' || columns === null || Array.isArray(columns)) return {};

  const out: Record<string, string> = {};
  for (const [heading, field] of Object.entries(columns)) {
    if (typeof field === 'string') out[heading] = field;
  }
  return out;
}

async function rememberMapping(
  ctx: Ctx,
  kind: ImportKind,
  columns: Record<string, string>,
): Promise<void> {
  const { error } = await ctx.db.from('import_mappings').upsert(
    { company_id: ctx.companyId, kind, columns, created_by: ctx.userId },
    { onConflict: 'company_id,kind' },
  );

  if (error) fail(error, 'The column choices could not be remembered.');
}

/** What is already on the list, lower-cased, so a repeat import is a no-op. */
async function existingKeys(ctx: Ctx, kind: ImportKind): Promise<Set<string>> {
  const table = kind === 'trucks' ? 'trucks' : kind === 'drivers' ? 'drivers' : 'customers';
  const column = kind === 'trucks' ? 'unit_number' : 'name';

  const { data, error } = await ctx.db
    .from(table)
    .select(column)
    .eq('company_id', ctx.companyId)
    .is('archived_at', null);

  if (error) fail(error, 'The existing records could not be read.');

  return new Set(
    (data as unknown as Record<string, string>[]).map((row) =>
      (row[column] ?? '').trim().toLowerCase(),
    ),
  );
}

function keyOf(kind: ImportKind, values: Record<string, CellValue>): string {
  const raw = kind === 'trucks' ? values.unit_number : values.name;
  return String(raw ?? '').trim().toLowerCase();
}

function rowFor(
  kind: ImportKind,
  companyId: string,
  values: Record<string, CellValue>,
): Record<string, CellValue | string> {
  // Only the fields src/domain/spreadsheet knows about reach this point, so
  // there is nothing to filter: the domain's field list is the allowlist.
  return { company_id: companyId, ...values };
}

export async function importSheet(
  ctx: Ctx,
  kind: ImportKind,
  mapping: Record<string, string>,
  rows: Record<string, string>[],
): Promise<ImportOutcome> {
  if (rows.length === 0) throw new ActionError('That sheet has no rows in it.');
  if (rows.length > MAX_ROWS) {
    throw new ActionError(
      `That sheet has ${rows.length} rows. Import at most ${MAX_ROWS} at a time.`,
    );
  }

  const problems: RowProblem[] = [];
  const good: Record<string, CellValue>[] = [];

  rows.forEach((cells, index) => {
    const parsed = parseRow(cells, mapping, kind);
    if (isImportable(parsed)) {
      good.push(parsed.values);
      return;
    }
    // Line numbers as the person sees them in their spreadsheet: row 1 is the
    // headings, so the first row of data is line 2.
    problems.push({
      line: index + 2,
      what: parsed.problems.map((problem) => `${problem.label} ${problem.message}`).join(', '),
    });
  });

  const already = await existingKeys(ctx, kind);
  const fresh: Record<string, CellValue>[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const values of good) {
    const key = keyOf(kind, values);
    // Already on the list, or twice in this very sheet.
    if (key === '' || already.has(key) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    fresh.push(values);
  }

  if (kind === 'trucks' && fresh.length > 0) {
    await assertTrucksAllowed(ctx, fresh.length);
  }

  let created = 0;
  if (fresh.length > 0) {
    const table = kind === 'trucks' ? 'trucks' : kind === 'drivers' ? 'drivers' : 'customers';
    const { data, error } = await ctx.db
      .from(table)
      .insert(fresh.map((values) => rowFor(kind, ctx.companyId, values)) as never)
      .select('id');

    if (error) fail(error, 'The import could not be saved. Nothing was changed.');
    created = data.length;
  }

  await rememberMapping(ctx, kind, mapping);

  await audit.record(ctx, {
    action: `import.${kind}`,
    subjectType: 'import',
    after: { created, skipped, rejected: problems.length },
  });

  return { created, skipped, problems };
}

/**
 * An import must not sneak past the plan's truck limit one row at a time, and
 * it must not import half a fleet and then stop: the whole sheet is checked
 * before anything is written.
 */
async function assertTrucksAllowed(ctx: Ctx, adding: number): Promise<void> {
  const entitlements = await getEntitlements(ctx);

  const { count, error } = await ctx.db
    .from('trucks')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ctx.companyId)
    .eq('status', 'active')
    .is('archived_at', null);

  if (error) fail(error, 'The trucks could not be counted.');

  const problem = truckLimitProblem({
    status: entitlements.status,
    truckLimit: entitlements.truckLimit,
    activeTrucks: (count ?? 0) + adding - 1,
    alreadyActive: false,
  });

  if (problem !== null) {
    throw new ActionError(
      `${problem} This sheet would add ${adding}, so nothing was imported.`,
    );
  }
}
