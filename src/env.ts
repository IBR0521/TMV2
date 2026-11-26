/**
 * Every environment variable the web app reads, in one place.
 *
 * These are functions, not constants, so that `next build` never fails on a
 * missing variable in a page that does not use Supabase at all. The message
 * names the variable and points at .env.example.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in ` +
        `(pnpm db:start then pnpm db:env writes the local Supabase values for you).`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';
}
