import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/server/db/database.types';

/**
 * The only place in TruckMates that holds the service-role key.
 *
 * CLAUDE.md, rule 1: an ESLint rule stops anything outside worker/ from
 * importing this file, so RLS can never be bypassed by web code. The worker
 * narrows every statement to one company itself — the key is a loaded gun.
 */
let client: SupabaseClient<Database> | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example; the worker needs it.`);
  }
  return value;
}

export function serviceDb(): SupabaseClient<Database> {
  client ??= createClient<Database>(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

/** Postgres connection string for the job queue (Graphile Worker). */
export function connectionString(): string {
  return required('DATABASE_URL');
}
