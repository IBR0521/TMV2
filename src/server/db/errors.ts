import type { PostgrestError } from '@supabase/supabase-js';
import { ActionError } from '../errors';

/**
 * Turns a Postgrest error into something a person can act on, or rethrows it
 * so the wrapper logs it to Sentry and says "something went wrong".
 *
 * RLS refusals land here as 42501 (or as zero affected rows, which the caller
 * checks). They are never shown as "permission denied" — that only tells a
 * person they found someone else's data.
 */
export function fail(error: PostgrestError, whenBlocked: string): never {
  if (error.code === '23505') {
    throw new ActionError(whenBlocked);
  }
  if (error.code === '42501' || error.code === 'PGRST301') {
    throw new ActionError(whenBlocked);
  }
  // Raised by a database function with `using errcode = ...`.
  if (error.code === '22023' || error.code === 'P0001') {
    throw new ActionError(error.message);
  }
  throw Object.assign(new Error(`${error.code ?? 'db'}: ${error.message}`), { cause: error });
}
