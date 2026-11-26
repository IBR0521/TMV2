import { complianceKindLabel, expiryWords, type ComplianceKind } from '../../src/domain/fleet';
import type { Rule } from './types';

/**
 * Phase 2's rule: a card on Today when a driver's or a unit's paperwork is
 * about to expire (docs/spec/spec.md, Event catalog — compliance.expiring).
 *
 * The daily job decides *when* to raise the event; this decides *what the card
 * says*, and nothing else. Pure: event in, actions out.
 *
 * The dedupe key carries the threshold as well as the document, so a document
 * produces one card at 30 days and a second, more urgent one at 7 — and never
 * two of either, however many times the job runs.
 */
type Payload = {
  documentId?: unknown;
  kind?: unknown;
  daysLeft?: unknown;
  expiresOn?: unknown;
  threshold?: unknown;
  subjectName?: unknown;
  subjectKind?: unknown;
};

const KINDS: readonly string[] = ['cdl', 'medical', 'registration', 'insurance', 'inspection'];

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}

export const complianceExpiringRule: Rule = {
  key: 'compliance.expiring.alert',
  handle: (event) => {
    const payload = event.payload as Payload;

    const documentId = typeof payload.documentId === 'string' ? payload.documentId : event.id;
    const threshold = typeof payload.threshold === 'number' ? payload.threshold : 30;
    const daysLeft = typeof payload.daysLeft === 'number' ? payload.daysLeft : threshold;

    const kind = typeof payload.kind === 'string' && KINDS.includes(payload.kind)
      ? complianceKindLabel(payload.kind as ComplianceKind)
      : 'Paperwork';

    const who = text(payload.subjectName, 'A unit');
    const subjectKind = text(payload.subjectKind, event.subjectType);
    const expiresOn = text(payload.expiresOn, '');

    const where =
      subjectKind === 'driver' ? 'the driver page' : 'the unit page';

    return [
      {
        kind: 'suggest',
        type: event.type,
        title: `${who}: ${kind} — ${expiryWords(daysLeft).toLowerCase()}`,
        detail:
          // Tense follows the fact: a card about a card that ran out last
          // week should not say the document "expires" next week.
          (expiresOn === ''
            ? ''
            : `${daysLeft < 0 ? 'Expired' : 'Expires'} ${expiresOn}. `) +
          `Upload the renewal on ${where}, then clear this card.`,
        dedupeKey: `compliance.expiring:${documentId}:${threshold}`,
        subjectType: subjectKind,
        subjectId: event.subjectId,
        actionName: 'acknowledge',
      },
    ];
  },
};
