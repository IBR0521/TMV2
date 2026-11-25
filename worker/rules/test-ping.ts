import type { Rule } from './types';

/**
 * Phase 1's one rule. It turns a test.ping event into a card on Today, which
 * is what proves the whole pipe: trigger -> events row -> queued job -> rule ->
 * suggestion -> Realtime -> screen.
 *
 * Phase 3 replaces it with the real load rules.
 */
export const testPingRule: Rule = {
  key: 'test.ping.acknowledge',
  handle: (event) => {
    const note = typeof event.payload.note === 'string' ? event.payload.note.trim() : '';

    return [
      {
        kind: 'suggest',
        type: event.type,
        title: note === '' ? 'A test event arrived' : `A test event arrived: ${note}`,
        detail: 'Nothing to do. This card proves events reach Today on their own.',
        // One card per ping, so repeated pings are visible as separate cards.
        dedupeKey: `test.ping:${event.subjectId ?? event.id}`,
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        actionName: 'acknowledge',
      },
    ];
  },
};
