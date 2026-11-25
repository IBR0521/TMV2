import { defaultModeFor, isAutomationMode, type AutomationMode } from '@/domain/automation';
import type { Ctx } from '../context';
import { fail } from '../db/errors';

/**
 * Per-company rule modes, and the phase 1 way to put something through the
 * automation pipe.
 *
 * A company only has an automation_settings row once it changes a rule; absent
 * means the rule's own default from src/domain/automation.ts.
 */
export async function modeFor(ctx: Ctx, ruleKey: string): Promise<AutomationMode> {
  const { data, error } = await ctx.db
    .from('automation_settings')
    .select('mode')
    .eq('company_id', ctx.companyId)
    .eq('rule_key', ruleKey)
    .maybeSingle();

  if (error) fail(error, 'The automation settings could not be read.');
  if (!data || !isAutomationMode(data.mode)) return defaultModeFor(ruleKey);
  return data.mode;
}

/**
 * Inserting a ping fires the trigger that writes an events row and queues the
 * worker job in the same transaction. Phase 1 only: phase 3 replaces it with
 * real load events.
 */
export async function sendTestPing(ctx: Ctx, note: string): Promise<string> {
  const { data, error } = await ctx.db
    .from('automation_test_pings')
    .insert({ company_id: ctx.companyId, note, created_by: ctx.userId })
    .select('id')
    .single();

  if (error) fail(error, 'That test event could not be recorded.');
  return data.id;
}
