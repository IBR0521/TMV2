import type { Rule } from './types';

/**
 * A truck has left a dock. If it sat there longer than the dock allows, the
 * broker owes detention, and somebody has to remember to bill it.
 *
 * docs/spec/spec.md, Event catalog — stop.departed: "Dwell over free time
 * becomes a detention charge. Suggest: add charge."
 *
 * It suggests the line and not the figure. Detention rates are per customer
 * and per contract and nothing in TruckMates records one yet, so the card
 * carries the hours — which is the part nobody can reconstruct a week later —
 * and the office puts the money in. Inventing a rate would produce invoices
 * that are wrong in a way nobody notices.
 */
export const stopDepartedRule: Rule = {
  key: 'stop.departed.detention',
  needs: 'stop_dwell',
  handle: (event, facts) => {
    const dwell = facts?.dwell?.dwell ?? null;
    if (dwell === null || !dwell.chargeable) return [];

    const where = facts?.dwell?.facilityName ?? 'the dock';
    const number = facts?.dwell?.loadNumber === null ? 'A load' : `#${facts?.dwell?.loadNumber}`;

    return [
      {
        kind: 'suggest',
        type: event.type,
        title: `${number} waited ${dwell.words} at ${where}`,
        detail: 'Accepting adds a detention line to the load; the amount is yours to put in.',
        // One card per stop: a correction to the departure time updates it
        // rather than stacking a second.
        dedupeKey: `stop.departed:${event.subjectId ?? event.id}`,
        subjectType: 'load',
        subjectId: facts?.dwell?.loadId ?? event.subjectId,
        actionName: 'add_detention_charge',
        actionParams: {
          loadId: facts?.dwell?.loadId ?? null,
          minutes: dwell.minutes,
          overMinutes: dwell.overMinutes,
          where,
        },
      },
    ];
  },
};
