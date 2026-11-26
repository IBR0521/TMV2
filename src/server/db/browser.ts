'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/env';
import type { Database } from './database.types';

/**
 * The browser's own client, for signing in and for Realtime. It holds the same
 * session as the server client, so RLS applies to it in exactly the same way:
 * a subscriber is only sent rows its policies allow.
 */
let client: SupabaseClient<Database> | undefined;

export function browserDb(): SupabaseClient<Database> {
  client ??= createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  return client;
}
