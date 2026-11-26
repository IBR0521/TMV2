import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/env';
import type { Database } from './database.types';

/**
 * The only database client the web app has.
 *
 * It carries the signed-in user's session, so every statement it issues runs
 * under RLS (docs/spec/architecture.md, Data access rules). The service-role
 * client, which bypasses RLS, exists only in worker/ and an ESLint rule stops
 * anything here from importing it.
 *
 * src/server/db/database.types.ts is generated with `pnpm db:types` and
 * committed, so the static CI job can typecheck without a database.
 */
export type Db = SupabaseClient<Database>;

export async function createDbClient(): Promise<Db> {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // A server component cannot write cookies. The middleware refreshes
          // the session, so there is nothing to do here.
        }
      },
    },
  });
}
