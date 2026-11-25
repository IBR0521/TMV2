/**
 * Installs the Graphile Worker schema, which is what gives the database
 * triggers their graphile_worker.add_job(). `pnpm db:reset` runs it so a fresh
 * database can queue jobs before the worker has ever started.
 */
import { config as loadEnv } from 'dotenv';
import { runMigrations } from 'graphile-worker';

loadEnv({ path: ['.env.local', '.env'] });

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

await runMigrations({ connectionString });
console.log('worker: job queue schema is up to date');
