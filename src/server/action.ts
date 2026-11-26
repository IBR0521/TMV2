import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { type Role, roleLabel } from '@/domain/roles';
import { requireContext, requireSession } from './context';
import type { Ctx, Session } from './context';
import { ActionError, NoCompanyError, NotSignedInError } from './errors';

/**
 * The only way a server action reaches the outside world.
 *
 * docs/spec/architecture.md, Data access rules:
 *   export const createLoad = action(schema, ['owner','dispatcher'], handler)
 *
 * The wrapper parses the input, builds ctx from the session, checks the role
 * and turns anything thrown into a plain result. An input schema may never
 * carry a company_id: that comes from the session, never from the browser.
 * tests/actions proves every exported action is wrapped.
 */

export { ActionError };

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ActionMeta = {
  roles: readonly Role[] | 'session';
  schemaKeys: readonly string[];
};

const ACTION_BRAND = Symbol.for('truckmates.action');

export type WrappedAction<I, T> = ((input: I) => Promise<ActionResult<T>>) & {
  [ACTION_BRAND]: ActionMeta;
};

export function isWrappedAction(value: unknown): value is WrappedAction<unknown, unknown> {
  return typeof value === 'function' && ACTION_BRAND in (value as object);
}

export function actionMeta(value: unknown): ActionMeta | null {
  return isWrappedAction(value) ? value[ACTION_BRAND] : null;
}

const FORBIDDEN_INPUT_KEYS = ['company_id', 'companyId'];

function schemaKeys(schema: z.ZodType): readonly string[] {
  const def = schema as unknown as { shape?: Record<string, unknown> };
  return def.shape ? Object.keys(def.shape) : [];
}

function assertNoTenantKey(keys: readonly string[]): void {
  const offending = keys.filter((key) => FORBIDDEN_INPUT_KEYS.includes(key));
  if (offending.length > 0) {
    // Thrown when the module is loaded, so this can never ship.
    throw new Error(
      `A server action input schema may not contain ${offending.join(', ')}: ` +
        'the company comes from the session (CLAUDE.md, rule 1).',
    );
  }
}

/** The message a person sees. Anything unexpected is logged, not shown. */
function present(error: unknown): ActionResult<never> {
  if (error instanceof NotSignedInError) {
    return { ok: false, error: 'Sign in to continue.' };
  }
  if (error instanceof NoCompanyError) {
    return { ok: false, error: 'This account does not belong to a company yet.' };
  }
  if (error instanceof ActionError) {
    return { ok: false, error: error.message };
  }

  Sentry.captureException(error);
  console.error('[action]', error);
  return { ok: false, error: 'Something went wrong. Nothing was saved.' };
}

function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * An action for someone working inside a company: ctx carries companyId and
 * role, and the role must be in allowedRoles.
 */
export function action<S extends z.ZodType, T>(
  schema: S,
  allowedRoles: readonly Role[],
  handler: (ctx: Ctx, input: z.output<S>) => Promise<T>,
): WrappedAction<z.input<S>, T> {
  const keys = schemaKeys(schema);
  assertNoTenantKey(keys);

  const run = async (input: z.input<S>): Promise<ActionResult<T>> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Check the highlighted fields.',
        fieldErrors: fieldErrorsOf(parsed.error),
      };
    }

    try {
      const ctx = await requireContext();
      if (!allowedRoles.includes(ctx.role)) {
        return { ok: false, error: `${roleLabel(ctx.role)} cannot do this.` };
      }
      return { ok: true, data: await handler(ctx, parsed.data as z.output<S>) };
    } catch (error) {
      return present(error);
    }
  };

  return Object.defineProperty(run, ACTION_BRAND, {
    value: { roles: allowedRoles, schemaKeys: keys } satisfies ActionMeta,
    enumerable: false,
  }) as WrappedAction<z.input<S>, T>;
}

/**
 * The two onboarding actions only: creating a company at signup and accepting
 * an invitation. At that moment the account is signed in but belongs to no
 * company, so there is no role to check. Both call a database function that
 * acts for auth.uid() and takes no company_id.
 */
export function sessionAction<S extends z.ZodType, T>(
  schema: S,
  handler: (session: Session, input: z.output<S>) => Promise<T>,
): WrappedAction<z.input<S>, T> {
  const keys = schemaKeys(schema);
  assertNoTenantKey(keys);

  const run = async (input: z.input<S>): Promise<ActionResult<T>> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: 'Check the highlighted fields.',
        fieldErrors: fieldErrorsOf(parsed.error),
      };
    }

    try {
      const session = await requireSession();
      return { ok: true, data: await handler(session, parsed.data as z.output<S>) };
    } catch (error) {
      return present(error);
    }
  };

  return Object.defineProperty(run, ACTION_BRAND, {
    value: { roles: 'session', schemaKeys: keys } satisfies ActionMeta,
    enumerable: false,
  }) as WrappedAction<z.input<S>, T>;
}
