import { describe, expect, it } from 'vitest';
import { rulesForEvent, suggestionLabelFor } from '@/domain/automation';
import { rulesListeningFor } from '../../worker/rules';
import { stopDepartedRule } from '../../worker/rules/stop-departed';
import type { WorkerEvent } from '../../worker/rules/types';

/**
 * The detention rule. The hours come from src/domain/detention.ts, which has
 * its own tests; this is about what the card says and when it stays quiet.
 */
const event: WorkerEvent = {
  id: '00000000-0000-0000-0000-0000000000e4',
  companyId: '00000000-0000-0000-0000-0000000000c1',
  type: 'stop.departed',
  subjectType: 'load_stop',
  subjectId: '00000000-0000-0000-0000-0000000000s1',
  payload: {},
  occurredAt: '2026-11-30T18:00:00Z',
};

const dwell = (over: number) => ({
  dwell: {
    dwell: {
      minutes: 120 + over,
      overMinutes: over,
      chargeable: over > 0,
      words: `${(120 + over) / 60} h, ${over} min over 2 h free`,
    },
    loadId: '00000000-0000-0000-0000-0000000000l1',
    loadNumber: '1041',
    facilityName: 'Harbor Foods DC 12',
    freeMinutes: 120,
  },
});

describe('the detention card', () => {
  it('says which load, how long and where', () => {
    const [action] = stopDepartedRule.handle(event, dwell(100));

    expect(action?.title).toContain('#1041');
    expect(action?.title).toContain('Harbor Foods DC 12');
    expect(action?.title).toContain('over 2 h free');
    expect(action?.actionName).toBe('add_detention_charge');
  });

  it('carries the load, not the stop, so accepting it knows where to put the line', () => {
    const [action] = stopDepartedRule.handle(event, dwell(100));

    expect(action?.subjectType).toBe('load');
    expect(action?.subjectId).toBe('00000000-0000-0000-0000-0000000000l1');
    expect(action?.actionParams).toMatchObject({ overMinutes: 100 });
  });

  // Most stops are inside the free time, and a card for each of those would
  // bury the ones that matter.
  it('stays quiet when the truck was inside the free time', () => {
    expect(stopDepartedRule.handle(event, dwell(0))).toEqual([]);
  });

  it('stays quiet when the stop has not finished', () => {
    expect(stopDepartedRule.handle(event, {})).toEqual([]);
  });

  // One card per stop: correcting a departure time updates it rather than
  // stacking a second, which is what "never duplicates" rests on.
  it('keys the card to the stop', () => {
    const [action] = stopDepartedRule.handle(event, dwell(100));
    expect(action?.dedupeKey).toBe(
      'stop.departed:00000000-0000-0000-0000-0000000000s1',
    );
  });
});

describe('the catalogue', () => {
  it('points the event at this rule, and labels it in words', () => {
    expect(rulesForEvent('stop.departed').map((rule) => rule.key)).toEqual([
      'stop.departed.detention',
    ]);
    expect(rulesListeningFor('stop.departed')).toHaveLength(1);
    expect(suggestionLabelFor('stop.departed')).toBe('Detention');
  });
});
