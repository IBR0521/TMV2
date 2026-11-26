import { describe, expect, it } from 'vitest';
import { rulesForEvent, suggestionLabelFor } from '@/domain/automation';
import { rulesListeningFor } from '../../worker/rules';
import { complianceExpiringRule } from '../../worker/rules/compliance-expiring';
import type { WorkerEvent } from '../../worker/rules/types';
import { candidatesFor } from '../../worker/tasks/check-compliance-expiry';

/**
 * Phase 2's automation: a card 30 days before a document expires, and a
 * second, more urgent one at 7 days — never two of either.
 *
 * The job decides when there is something to say; the rule decides what the
 * card says. Both halves are pure, so both are tested without a database.
 */
function event(payload: Record<string, unknown>): WorkerEvent {
  return {
    id: '00000000-0000-0000-0000-0000000000e9',
    companyId: '00000000-0000-0000-0000-0000000000c1',
    type: 'compliance.expiring',
    subjectType: 'driver',
    subjectId: '00000000-0000-0000-0000-0000000000d1',
    payload,
    occurredAt: '2026-11-26T11:00:00Z',
  };
}

const document = (over: Partial<Parameters<typeof candidatesFor>[0][number]> = {}) => ({
  id: 'doc-1',
  kind: 'cdl',
  expires_on: '2026-12-01',
  driver_id: 'driver-1',
  truck_id: null,
  trailer_id: null,
  ...over,
});

describe('the daily expiry check', () => {
  it('says nothing about a document that is months away', () => {
    expect(candidatesFor([document({ expires_on: '2027-06-30' })], '2026-11-26')).toEqual([]);
  });

  it('raises the wide window a month out', () => {
    const [candidate] = candidatesFor([document({ expires_on: '2026-12-26' })], '2026-11-26');

    expect(candidate?.threshold).toBe(30);
    expect(candidate?.daysLeft).toBe(30);
    expect(candidate?.dedupeKey).toBe('compliance.expiring:doc-1:30');
  });

  it('raises the tight window a week out, under its own key', () => {
    const [candidate] = candidatesFor([document({ expires_on: '2026-12-01' })], '2026-11-26');

    expect(candidate?.threshold).toBe(7);
    expect(candidate?.dedupeKey).toBe('compliance.expiring:doc-1:7');
  });

  // The two keys differ, so a document that was flagged at 30 days is flagged
  // again at 7 — and the caller, which skips keys it has already raised, never
  // raises either twice.
  it('gives the two windows different keys, so each is raised once', () => {
    const wide = candidatesFor([document({ expires_on: '2026-12-26' })], '2026-11-26');
    const tight = candidatesFor([document({ expires_on: '2026-12-01' })], '2026-11-26');

    expect(wide[0]?.dedupeKey).not.toBe(tight[0]?.dedupeKey);
  });

  it('keeps reporting a document that has already expired', () => {
    const [candidate] = candidatesFor([document({ expires_on: '2026-11-20' })], '2026-11-26');

    expect(candidate?.threshold).toBe(7);
    expect(candidate?.daysLeft).toBe(-6);
  });

  it('knows which kind of thing the document belongs to', () => {
    const [truck] = candidatesFor(
      [document({ id: 'doc-2', kind: 'registration', driver_id: null, truck_id: 'truck-1' })],
      '2026-11-26',
    );
    const [trailer] = candidatesFor(
      [document({ id: 'doc-3', kind: 'inspection', driver_id: null, trailer_id: 'trailer-1' })],
      '2026-11-26',
    );

    expect(truck?.subject).toBe('truck');
    expect(truck?.subjectId).toBe('truck-1');
    expect(trailer?.subject).toBe('trailer');
  });

  it('ignores a document with no expiry at all', () => {
    expect(candidatesFor([document({ expires_on: null })], '2026-11-26')).toEqual([]);
  });
});

describe('the card it produces', () => {
  it('names the driver, the document and how long is left', () => {
    const [action] = complianceExpiringRule.handle(
      event({
        documentId: 'doc-1',
        kind: 'cdl',
        daysLeft: 5,
        threshold: 7,
        expiresOn: '2026-12-01',
        subjectKind: 'driver',
        subjectName: 'Luis Ortega',
      }),
    );

    expect(action?.title).toBe('Luis Ortega: CDL — 5 days left');
    expect(action?.detail).toContain('Expires 2026-12-01');
    expect(action?.detail).toContain('the driver page');
    expect(action?.dedupeKey).toBe('compliance.expiring:doc-1:7');
  });

  it('says a unit is a unit, and points at the unit page', () => {
    const [action] = complianceExpiringRule.handle(
      event({
        documentId: 'doc-2',
        kind: 'registration',
        daysLeft: 12,
        threshold: 30,
        expiresOn: '2026-12-08',
        subjectKind: 'truck',
        subjectName: 'Unit 117',
      }),
    );

    expect(action?.title).toBe('Unit 117: Registration — 12 days left');
    expect(action?.detail).toContain('the unit page');
    expect(action?.subjectType).toBe('truck');
  });

  it('says so plainly when the document has already expired', () => {
    const [action] = complianceExpiringRule.handle(
      event({
        documentId: 'doc-3',
        kind: 'medical',
        daysLeft: -3,
        threshold: 7,
        expiresOn: '2026-11-23',
        subjectKind: 'driver',
        subjectName: 'Dee Baker',
      }),
    );

    expect(action?.title).toBe('Dee Baker: Medical card — expired 3 days ago');
    expect(action?.detail).toContain('Expired 2026-11-23');
    expect(action?.detail).not.toContain('Expires 2026-11-23');
  });

  it('produces one card, not several', () => {
    expect(complianceExpiringRule.handle(event({ documentId: 'doc-1' }))).toHaveLength(1);
  });

  // A card nobody can act on would be worse than no card: accepting it is how
  // the office says "dealt with".
  it('can be accepted', () => {
    const [action] = complianceExpiringRule.handle(event({ documentId: 'doc-1' }));
    expect(action?.actionName).toBe('acknowledge');
  });
});

describe('the catalogue', () => {
  it('points the event at this rule', () => {
    expect(rulesForEvent('compliance.expiring').map((rule) => rule.key)).toEqual([
      'compliance.expiring.alert',
    ]);
    expect(rulesListeningFor('compliance.expiring')).toHaveLength(1);
  });

  it('labels the card in words', () => {
    expect(suggestionLabelFor('compliance.expiring')).toBe('Expiring paperwork');
  });
});
