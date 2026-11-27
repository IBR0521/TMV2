import { describe, expect, it } from 'vitest';
import { AUTOMATION_RULES, defaultModeFor, rulesForEvent, suggestionLabelFor } from '@/domain/automation';
import { RULES, ruleByKey, rulesListeningFor } from '../../worker/rules';
import type { WorkerEvent } from '../../worker/rules/types';

/**
 * A rule is event in, actions out, so it can be tested with a plain object and
 * no database at all (CLAUDE.md, rule 4).
 */
const event: WorkerEvent = {
  id: '00000000-0000-0000-0000-0000000000e1',
  companyId: '00000000-0000-0000-0000-0000000000c1',
  type: 'test.ping',
  subjectType: 'automation_test_ping',
  subjectId: '00000000-0000-0000-0000-0000000000p1',
  payload: { note: 'Sent from Today' },
  occurredAt: '2026-11-25T12:00:00Z',
};

describe('the rule catalogue', () => {
  it('has a worker rule for every catalogued key, and no stray rules', () => {
    expect(RULES.map((r) => r.key).sort()).toEqual(AUTOMATION_RULES.map((r) => r.key).sort());
    for (const entry of AUTOMATION_RULES) {
      expect(ruleByKey(entry.key), `no rule implements ${entry.key}`).toBeDefined();
    }
  });

  it('defaults an unknown rule to off rather than to acting on its own', () => {
    expect(defaultModeFor('nothing.like.this')).toBe('off');
    expect(defaultModeFor('test.ping.acknowledge')).toBe('suggest');
  });

  it('finds the rules listening for an event', () => {
    expect(rulesForEvent('test.ping').map((r) => r.key)).toEqual(['test.ping.acknowledge']);
    expect(rulesListeningFor('test.ping')).toHaveLength(1);
    expect(rulesListeningFor('load.booked')).toHaveLength(1);
    // An event nothing listens for yet returns nothing, rather than guessing.
    expect(rulesListeningFor('invoice.overdue')).toHaveLength(0);
  });

  it('labels a card with words, not an event type', () => {
    expect(suggestionLabelFor('test.ping')).toBe('Test event');
    expect(suggestionLabelFor('load.delivered')).toBe('load.delivered');
  });
});

describe('the test.ping rule', () => {
  it('turns a ping into one suggestion keyed to that ping', () => {
    const actions = rulesListeningFor('test.ping')[0]!.handle(event);

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      kind: 'suggest',
      type: 'test.ping',
      title: 'A test event arrived: Sent from Today',
      dedupeKey: `test.ping:${event.subjectId}`,
      actionName: 'acknowledge',
    });
  });

  it('copes with a ping that carries no note', () => {
    const actions = rulesListeningFor('test.ping')[0]!.handle({ ...event, payload: {} });
    expect(actions[0]?.title).toBe('A test event arrived');
  });
});
