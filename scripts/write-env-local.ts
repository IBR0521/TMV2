/**
 * Writes .env.local from the running local Supabase stack, so nobody has to
 * copy keys out of `supabase start` output by hand.
 *
 *   pnpm db:start && pnpm db:env
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname ?? __dirname, '..');
const target = join(root, '.env.local');

type Status = {
  API_URL?: string;
  DB_URL?: string;
  ANON_KEY?: string;
  SERVICE_ROLE_KEY?: string;
};

function status(): Status {
  const raw = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(raw) as Status;
}

const s = status();
const values: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: s.API_URL ?? 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: s.ANON_KEY ?? '',
  SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY ?? '',
  DATABASE_URL: s.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000',
};

const missing = Object.entries(values)
  .filter(([, v]) => v === '')
  .map(([k]) => k);
if (missing.length > 0) {
  console.error(`supabase status did not report: ${missing.join(', ')}. Is pnpm db:start running?`);
  process.exit(1);
}

// Keep any line the owner added by hand that we do not manage.
const kept = existsSync(target)
  ? readFileSync(target, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '' && !Object.keys(values).some((k) => line.startsWith(`${k}=`)))
  : [];

const body = [
  '# Written by pnpm db:env from the local Supabase stack. Not committed.',
  ...Object.entries(values).map(([k, v]) => `${k}=${v}`),
  ...kept,
  '',
].join('\n');

writeFileSync(target, body, 'utf8');
console.log(`env: wrote .env.local for ${values.NEXT_PUBLIC_SUPABASE_URL}`);
