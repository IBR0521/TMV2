import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { actionMeta, isWrappedAction } from '@/server/action';

/**
 * docs/spec/architecture.md, Data access rules: "A test lists every exported
 * server action and fails if any is not wrapped."
 *
 * An unwrapped export in a "use server" module is a public endpoint with no
 * session, no role check and no input validation. v1 shipped several.
 */
const ACTIONS_DIR = join(process.cwd(), 'src/server/actions');

const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts') && !f.startsWith('_'));

describe('every exported server action', () => {
  it('has action files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`is wrapped in ${file}`, async () => {
      const mod = (await import(join(ACTIONS_DIR, file))) as Record<string, unknown>;
      const exports = Object.entries(mod).filter(([name]) => name !== 'default');

      expect(exports.length, `${file} exports nothing`).toBeGreaterThan(0);

      for (const [name, value] of exports) {
        expect(typeof value, `${file}: ${name} is not a function`).toBe('function');
        expect(isWrappedAction(value), `${file}: ${name} is not wrapped in action()`).toBe(true);

        const meta = actionMeta(value);
        expect(meta, `${file}: ${name} has no action metadata`).not.toBeNull();

        // The company is never an input: it comes from the session.
        expect(meta?.schemaKeys ?? []).not.toContain('company_id');
        expect(meta?.schemaKeys ?? []).not.toContain('companyId');

        // Either a list of roles, or the two onboarding actions that run before
        // the account belongs to a company.
        if (meta?.roles !== 'session') {
          expect(Array.isArray(meta?.roles), `${file}: ${name} has no roles`).toBe(true);
          expect((meta?.roles as readonly string[]).length).toBeGreaterThan(0);
        }
      }
    });
  }
});
