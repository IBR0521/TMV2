import { bestCandidate } from '../../src/domain/dispatch';
import type { Rule } from './types';

/**
 * Phase 3's dispatch rule: a load has been booked, so suggest who takes it.
 *
 * docs/spec/spec.md, Event catalog — load.booked: "Rank available drivers and
 * trucks. Suggest: assign."
 *
 * The ranking is src/domain/dispatch.ts and the facts come from the task, so
 * this decides nothing it cannot explain: the card carries the reason, and
 * accepting it runs the same assign the dispatch board runs.
 *
 * It suggests one driver, not a shortlist. The dispatcher knows things this
 * does not — who is reliable on a reefer, who will not go near that dock —
 * and a card that says "here is my guess, and why" respects that. A card
 * listing six options respects nobody's time.
 */
type Payload = { load_number?: unknown };

export const loadBookedRule: Rule = {
  key: 'load.booked.assign',
  needs: 'driver_candidates',
  handle: (event, facts) => {
    const payload = event.payload as Payload;
    const number =
      typeof payload.load_number === 'string' ? `#${payload.load_number}` : 'This load';

    const best = bestCandidate(facts?.candidates ?? [], facts?.pickup ?? null);

    if (best === null) {
      // Saying "nobody is free" is worth a card of its own: it is the thing a
      // dispatcher most needs to know early, and the thing they will
      // otherwise find out on the morning of the pickup.
      return [
        {
          kind: 'suggest',
          type: event.type,
          title: `${number} needs a driver, and nobody is free`,
          detail: 'Every active driver already has a load across the pickup day.',
          dedupeKey: `load.booked:${event.subjectId ?? event.id}`,
          subjectType: 'load',
          subjectId: event.subjectId,
          actionName: 'acknowledge',
        },
      ];
    }

    const { candidate, because } = best;

    return [
      {
        kind: 'suggest',
        type: event.type,
        title: `${number}: ${candidate.driverName} on unit ${candidate.truckUnit ?? '—'}`,
        detail: `${because}. Accepting puts them on the load; dispatching stays your call.`,
        dedupeKey: `load.booked:${event.subjectId ?? event.id}`,
        subjectType: 'load',
        subjectId: event.subjectId,
        actionName: 'assign_suggested_driver',
        actionParams: {
          loadId: event.subjectId,
          driverId: candidate.driverId,
          truckId: candidate.truckId,
        },
      },
    ];
  },
};
