import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const requireContext = vi.fn();
const requireSession = vi.fn();

vi.mock('@/server/context', () => ({
  requireContext: () => requireContext(),
  requireSession: () => requireSession(),
}));

const { action, sessionAction, ActionError, isWrappedAction } = await import('@/server/action');

const ctx = {
  userId: 'u1',
  authId: 'a1',
  email: 'owner@alpha.test',
  name: 'Ann',
  companyId: 'c1',
  role: 'dispatcher' as const,
  driverId: null,
  db: {} as never,
};

beforeEach(() => {
  requireContext.mockReset();
  requireSession.mockReset();
  requireContext.mockResolvedValue(ctx);
  requireSession.mockResolvedValue(ctx);
});

describe('action()', () => {
  it('refuses to build an action whose input carries a company id', () => {
    expect(() => action(z.object({ company_id: z.uuid() }), ['owner'], async () => null)).toThrow(
      /may not contain company_id/,
    );
    expect(() => action(z.object({ companyId: z.uuid() }), ['owner'], async () => null)).toThrow(
      /may not contain companyId/,
    );
    expect(() =>
      sessionAction(z.object({ companyId: z.uuid() }), async () => null),
    ).toThrow(/companyId/);
  });

  it('marks what it builds as wrapped', () => {
    expect(isWrappedAction(action(z.object({}), ['owner'], async () => null))).toBe(true);
    expect(isWrappedAction(async () => null)).toBe(false);
  });

  it('turns a bad input into field errors instead of an exception', async () => {
    const run = action(z.object({ note: z.string().min(3) }), ['dispatcher'], async () => 'ok');

    const result = await run({ note: 'x' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Check the highlighted fields.');
      expect(result.fieldErrors?.note).toBeDefined();
    }
  });

  it('checks the role before the handler runs', async () => {
    const handler = vi.fn(async () => 'ran');
    const run = action(z.object({}), ['owner'], handler);

    const result = await run({});

    expect(result).toEqual({ ok: false, error: 'Dispatcher cannot do this.' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes the context, never the input, as the source of the company', async () => {
    const run = action(z.object({ note: z.string() }), ['dispatcher'], async (c, input) => ({
      companyId: c.companyId,
      note: input.note,
    }));

    const result = await run({ note: 'hello' });

    expect(result).toEqual({ ok: true, data: { companyId: 'c1', note: 'hello' } });
  });

  it('shows a readable problem and hides an unexpected one', async () => {
    const readable = action(z.object({}), ['dispatcher'], async () => {
      throw new ActionError('That invitation is no longer open.');
    });
    expect(await readable({})).toEqual({ ok: false, error: 'That invitation is no longer open.' });

    const unexpected = action(z.object({}), ['dispatcher'], async () => {
      throw new Error('column "secret" does not exist');
    });
    expect(await unexpected({})).toEqual({
      ok: false,
      error: 'Something went wrong. Nothing was saved.',
    });
  });

  it('refuses when nobody is signed in', async () => {
    const { NotSignedInError } = await import('@/server/errors');
    requireContext.mockRejectedValue(new NotSignedInError());

    const run = action(z.object({}), ['dispatcher'], async () => 'ok');
    expect(await run({})).toEqual({ ok: false, error: 'Sign in to continue.' });
  });
});

describe('sessionAction()', () => {
  it('runs without a company or a role', async () => {
    const run = sessionAction(z.object({ token: z.string() }), async (session, input) => ({
      email: session.email,
      token: input.token,
    }));

    expect(await run({ token: 'abc' })).toEqual({
      ok: true,
      data: { email: 'owner@alpha.test', token: 'abc' },
    });
  });
});
