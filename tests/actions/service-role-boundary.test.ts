import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/**
 * CLAUDE.md, rule 1: "The service-role client is imported only inside worker/.
 * An ESLint no-restricted-imports rule enforces this."
 *
 * Two checks, because one alone is not enough:
 *   1. lint really does fail on such an import in app or src code
 *   2. the key itself appears nowhere but the files allowed to hold it
 */
const root = process.cwd();

describe('the service-role boundary', () => {
  it('fails lint when app code imports the worker client', async () => {
    const eslint = new ESLint({ cwd: root });

    const leak = `
      import { serviceDb } from '../../../worker/db';
      export async function anything() {
        return serviceDb().from('loads').select('*');
      }
    `;

    const [result] = await eslint.lintText(leak, {
      filePath: `${root}/src/server/services/lint-probe.ts`,
      warnIgnored: false,
    });

    const messages = result?.messages ?? [];
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true);
    expect(messages.some((m) => /service-role client/i.test(m.message))).toBe(true);
    expect(result?.errorCount ?? 0).toBeGreaterThan(0);
  });

  it('passes lint on the same file without that import', async () => {
    const eslint = new ESLint({ cwd: root });

    const fine = `
      export function anything(): string {
        return 'no database here';
      }
    `;

    const [result] = await eslint.lintText(fine, {
      filePath: `${root}/src/server/services/lint-probe.ts`,
      warnIgnored: false,
    });

    expect(
      (result?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports'),
    ).toHaveLength(0);
  });

  it('keeps the key itself out of everything but the worker, the seed and the tests', () => {
    // Tracked and untracked files, but nothing git ignores, so node_modules
    // and build output stay out of scope. git grep exits 1 when it finds
    // nothing, which is a pass, not a failure.
    let output = '';
    try {
      output = execFileSync(
        'git',
        ['grep', '-l', '--untracked', '--', 'SUPABASE_SERVICE_ROLE_KEY'],
        { cwd: root, encoding: 'utf8' },
      );
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 1) throw error;
    }

    const allowed = new Set([
      '.env.example',
      '.github/workflows/ci.yml',
      'docs/progress.md',
      'scripts/lib/provision.ts',
      'scripts/write-env-local.ts',
      'tests/actions/service-role-boundary.test.ts',
      'tests/support/supabase.ts',
      'worker/db.ts',
    ]);

    const offenders = output
      .split('\n')
      .filter((line) => line.trim() !== '')
      .filter((file) => !allowed.has(file));

    expect(offenders, `the service-role key may not be read in: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });
});
