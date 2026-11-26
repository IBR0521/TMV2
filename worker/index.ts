import { createServer } from 'node:http';
import { config as loadEnv } from 'dotenv';
import { run, type Runner } from 'graphile-worker';
import { connectionString } from './db';
import { processEvent } from './tasks/process-event';
import { sweepEvents } from './tasks/sweep-events';

/**
 * The worker: a plain Node process that reads jobs from Postgres and applies
 * the automation rules (docs/spec/architecture.md, System overview). It runs on
 * its own small VPS from phase 3; in development `pnpm worker` is enough.
 *
 * Starting it also installs the graphile_worker schema, which is what gives the
 * database triggers their add_job() function.
 */
loadEnv({ path: ['.env.local', '.env'] });

const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 8081);

async function main(): Promise<void> {
  const runner: Runner = await run({
    connectionString: connectionString(),
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5),
    noHandleSignals: true,
    taskList: {
      process_event: processEvent,
      sweep_events: sweepEvents,
    },
    // Scheduled tasks replace cron (CLAUDE.md, rule 4).
    crontab: '*/5 * * * * sweep_events',
  });

  // Something has to be able to say "the worker is alive" — the health check
  // its VPS and the end-to-end tests both wait on.
  const health = createServer((request, response) => {
    if (request.url?.startsWith('/health')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok', tasks: ['process_event', 'sweep_events'] }));
      return;
    }
    response.writeHead(404).end();
  });
  health.listen(HEALTH_PORT, '127.0.0.1', () => {
    console.log(`worker: ready, health on http://127.0.0.1:${HEALTH_PORT}/health`);
  });

  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`worker: ${signal}, finishing the job in hand`);
    health.close();
    await runner.stop();
  };

  process.on('SIGINT', () => void stop('SIGINT'));
  process.on('SIGTERM', () => void stop('SIGTERM'));

  await runner.promise;
}

main().catch((error: unknown) => {
  console.error('worker: stopped', error);
  process.exit(1);
});
