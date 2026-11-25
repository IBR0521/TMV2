import type { Ctx } from '../context';
import { fail } from '../db/errors';

/**
 * Who did what. Append-only: the table grants select and insert and nothing
 * else, so neither a person nor a bug can rewrite history.
 */
export type AuditEntry = {
  action: string;
  subjectType: string;
  subjectId?: string | null;
  before?: unknown;
  after?: unknown;
};

export async function record(ctx: Ctx, entry: AuditEntry): Promise<void> {
  const { error } = await ctx.db.from('audit_log').insert({
    company_id: ctx.companyId,
    actor_type: 'user',
    actor_id: ctx.userId,
    action: entry.action,
    subject_type: entry.subjectType,
    subject_id: entry.subjectId ?? null,
    before: (entry.before ?? null) as never,
    after: (entry.after ?? null) as never,
  });

  if (error) fail(error, 'That could not be recorded.');
}
