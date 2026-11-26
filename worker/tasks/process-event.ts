import type { Task } from 'graphile-worker';
import { defaultModeFor, isAutomationMode, type AutomationMode } from '../../src/domain/automation';
import { serviceDb } from '../db';
import { rulesListeningFor } from '../rules';
import type { RuleAction, WorkerEvent } from '../rules/types';

/**
 * One event, every rule that listens for it.
 *
 * docs/spec/architecture.md, Automation engine, steps 3 and 4: load the rules
 * for the event type, check the company's mode for each, and apply what the
 * rule returns. The job is safe to run twice: an event already marked
 * processed is skipped, and a suggestion is upserted on its dedupe key.
 */
type Payload = { event_id?: unknown; company_id?: unknown };

async function modeFor(companyId: string, ruleKey: string): Promise<AutomationMode> {
  const { data, error } = await serviceDb()
    .from('automation_settings')
    .select('mode')
    .eq('company_id', companyId)
    .eq('rule_key', ruleKey)
    .maybeSingle();

  if (error) throw new Error(`automation_settings: ${error.message}`);
  if (!data || !isAutomationMode(data.mode)) return defaultModeFor(ruleKey);
  return data.mode;
}

async function applySuggestion(event: WorkerEvent, action: RuleAction): Promise<void> {
  const { error } = await serviceDb()
    .from('suggestions')
    .upsert(
      {
        company_id: event.companyId,
        type: action.type,
        title: action.title,
        detail: action.detail ?? null,
        subject_type: action.subjectType ?? event.subjectType,
        subject_id: action.subjectId ?? event.subjectId,
        action_name: action.actionName ?? null,
        action_params: action.actionParams ?? {},
        dedupe_key: action.dedupeKey,
        event_id: event.id,
        // A repeated event re-opens the card rather than stacking another one.
        status: 'open',
        resolved_at: null,
        resolved_by: null,
      },
      { onConflict: 'company_id,dedupe_key' },
    );

  if (error) throw new Error(`suggestions upsert: ${error.message}`);
}

export const processEvent: Task = async (rawPayload, helpers) => {
  const payload = (rawPayload ?? {}) as Payload;
  const eventId = typeof payload.event_id === 'string' ? payload.event_id : null;
  if (!eventId) {
    helpers.logger.warn('process_event called without an event_id');
    return;
  }

  const db = serviceDb();
  const { data: row, error } = await db
    .from('events')
    .select('id, company_id, type, subject_type, subject_id, payload, occurred_at, processed_at')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw new Error(`events: ${error.message}`);
  if (!row) {
    helpers.logger.warn(`event ${eventId} is gone`);
    return;
  }
  if (row.processed_at) return;

  const event: WorkerEvent = {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    occurredAt: row.occurred_at,
  };

  for (const rule of rulesListeningFor(event.type)) {
    const mode = await modeFor(event.companyId, rule.key);
    if (mode === 'off') continue;

    for (const action of rule.handle(event)) {
      if (mode === 'suggest' && action.kind === 'suggest') {
        await applySuggestion(event, action);
      }
      // Auto actions arrive in phase 3, with audit_log and an undo payload.
    }
  }

  const { error: doneError } = await db
    .from('events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', event.id)
    .eq('company_id', event.companyId);

  if (doneError) throw new Error(`events update: ${doneError.message}`);
};
