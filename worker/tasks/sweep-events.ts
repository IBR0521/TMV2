import type { Task } from 'graphile-worker';
import { serviceDb } from '../db';

/**
 * The safety net. A trigger queues its job in the same transaction as the
 * change, but if the queue schema was not installed yet (a fresh database, the
 * worker not started) the event is still recorded with job_queued = false.
 * This scheduled task picks those up, so nothing is ever silently lost.
 */
const BATCH = 200;

export const sweepEvents: Task = async (_payload, helpers) => {
  const db = serviceDb();

  const { data, error } = await db
    .from('events')
    .select('id, company_id, type')
    .is('processed_at', null)
    .eq('job_queued', false)
    .order('occurred_at', { ascending: true })
    .limit(BATCH);

  if (error) throw new Error(`events sweep: ${error.message}`);
  if (!data || data.length === 0) return;

  for (const event of data) {
    await helpers.addJob('process_event', {
      event_id: event.id,
      company_id: event.company_id,
      type: event.type,
    });

    const { error: markError } = await db
      .from('events')
      .update({ job_queued: true })
      .eq('id', event.id)
      .eq('company_id', event.company_id);

    if (markError) throw new Error(`events mark queued: ${markError.message}`);
  }

  helpers.logger.info(`swept ${data.length} event(s) that had no job`);
};
