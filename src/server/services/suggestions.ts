import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

/**
 * The Today inbox. The worker writes these rows; the office resolves them.
 *
 * Accepting a suggestion runs the same service the manual screen would run,
 * with the clicking user's ctx, so roles and RLS still apply (CLAUDE.md,
 * rule 4). Phase 1 has one rule and one acceptable action: acknowledge.
 */
export type Suggestion = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  subjectType: string | null;
  subjectId: string | null;
  actionName: string | null;
  createdAt: string;
};

type AcceptHandler = (ctx: Ctx, params: Record<string, unknown>) => Promise<void>;

/**
 * Phase 1: acknowledging a card only resolves it. Every later phase adds its
 * real action here, pointing at the service its screen already calls.
 */
const ACCEPT_HANDLERS: Record<string, AcceptHandler> = {
  acknowledge: async () => {},
};

export async function listOpen(ctx: Ctx): Promise<Suggestion[]> {
  const { data, error } = await ctx.db
    .from('suggestions')
    .select('id, type, title, detail, subject_type, subject_id, action_name, created_at')
    .eq('company_id', ctx.companyId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) fail(error, 'Today could not be read.');

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    detail: row.detail,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    actionName: row.action_name,
    createdAt: row.created_at,
  }));
}

export async function countOpen(ctx: Ctx): Promise<number> {
  const { count, error } = await ctx.db
    .from('suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ctx.companyId)
    .eq('status', 'open');

  if (error) fail(error, 'Today could not be read.');
  return count ?? 0;
}

async function resolve(
  ctx: Ctx,
  suggestionId: string,
  status: 'accepted' | 'dismissed',
): Promise<Suggestion> {
  const { data, error } = await ctx.db
    .from('suggestions')
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: ctx.userId })
    .eq('company_id', ctx.companyId)
    .eq('id', suggestionId)
    .eq('status', 'open')
    .select('id, type, title, detail, subject_type, subject_id, action_name, created_at')
    .maybeSingle();

  if (error) fail(error, 'That card could not be updated.');
  if (!data) throw new ActionError('Someone has already handled that card.');

  return {
    id: data.id,
    type: data.type,
    title: data.title,
    detail: data.detail,
    subjectType: data.subject_type,
    subjectId: data.subject_id,
    actionName: data.action_name,
    createdAt: data.created_at,
  };
}

export async function dismiss(ctx: Ctx, suggestionId: string): Promise<void> {
  const suggestion = await resolve(ctx, suggestionId, 'dismissed');

  await audit.record(ctx, {
    action: 'suggestion.dismissed',
    subjectType: 'suggestion',
    subjectId: suggestion.id,
    before: { status: 'open', type: suggestion.type },
    after: { status: 'dismissed' },
  });
}

export async function accept(ctx: Ctx, suggestionId: string): Promise<void> {
  const { data: row, error } = await ctx.db
    .from('suggestions')
    .select('id, action_name, action_params')
    .eq('company_id', ctx.companyId)
    .eq('id', suggestionId)
    .eq('status', 'open')
    .maybeSingle();

  if (error) fail(error, 'That card could not be read.');
  if (!row) throw new ActionError('Someone has already handled that card.');

  const handler = row.action_name ? ACCEPT_HANDLERS[row.action_name] : undefined;
  if (!handler) {
    throw new ActionError('There is nothing to accept on that card yet.');
  }

  await handler(ctx, (row.action_params ?? {}) as Record<string, unknown>);
  const suggestion = await resolve(ctx, suggestionId, 'accepted');

  await audit.record(ctx, {
    action: 'suggestion.accepted',
    subjectType: 'suggestion',
    subjectId: suggestion.id,
    before: { status: 'open', type: suggestion.type },
    after: { status: 'accepted', action: row.action_name },
  });
}
