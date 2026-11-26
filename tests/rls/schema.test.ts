import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminDb, tenantTables, type Db } from '../support/supabase';

/**
 * The generated types are committed so the static CI job can typecheck without
 * a database. This is what keeps them honest: if a migration adds a table and
 * nobody runs `pnpm db:types`, this fails.
 */
const admin: Db = adminDb();

describe('the committed database types', () => {
  it('know every tenant table in the database', async () => {
    const source = readFileSync(
      join(process.cwd(), 'src/server/db/database.types.ts'),
      'utf8',
    );
    const tables = await tenantTables(admin);

    const missing = tables.filter((table) => !source.includes(`"${table}": {`));

    expect(
      missing,
      `run pnpm db:types and commit the result; missing: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('know the tables that are not tenant-scoped too', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/server/db/database.types.ts'),
      'utf8',
    );
    expect(source).toContain('"users": {');
  });
});
