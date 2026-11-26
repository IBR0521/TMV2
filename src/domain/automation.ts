/**
 * The rule catalogue: which event a rule listens for, and the mode it runs in
 * when a company has not chosen one.
 *
 * The rule functions themselves live in worker/rules (CLAUDE.md, rule 4); this
 * is the shared data both the worker and the Settings screen read, which is
 * why it sits in src/domain where both may import it.
 *
 * Pure: no database, no network, no clock.
 */
export const AUTOMATION_MODES = ['auto', 'suggest', 'off'] as const;

export type AutomationMode = (typeof AUTOMATION_MODES)[number];

export type AutomationRule = {
  key: string;
  /** The event type from docs/spec/spec.md, Event catalog. */
  event: string;
  label: string;
  /** What the card or action says once the rule fires. */
  description: string;
  defaultMode: AutomationMode;
};

/**
 * Phase 1's rule exists to prove the pipe end to end: trigger -> events row ->
 * worker job -> suggestion -> Today, live. Phase 2 adds the first rule a
 * carrier actually cares about. Phase 3 adds the load rules.
 */
export const AUTOMATION_RULES: readonly AutomationRule[] = [
  {
    key: 'test.ping.acknowledge',
    event: 'test.ping',
    label: 'Test event',
    description: 'Puts a card on Today so the automation pipe can be checked.',
    defaultMode: 'suggest',
  },
  {
    key: 'compliance.expiring.alert',
    event: 'compliance.expiring',
    label: 'Expiring paperwork',
    description:
      'A card 30 days before a CDL, medical card, registration, insurance or '
      + 'inspection expires, and again at 7 days.',
    defaultMode: 'suggest',
  },
];

export function isAutomationMode(value: string): value is AutomationMode {
  return (AUTOMATION_MODES as readonly string[]).includes(value);
}

export function rulesForEvent(event: string): readonly AutomationRule[] {
  return AUTOMATION_RULES.filter((rule) => rule.event === event);
}

export function defaultModeFor(key: string): AutomationMode {
  return AUTOMATION_RULES.find((rule) => rule.key === key)?.defaultMode ?? 'off';
}

/**
 * The small grey label above a Today row. Falls back to the raw event type, so
 * a rule added without a label is visible rather than invisible.
 */
export function suggestionLabelFor(type: string): string {
  return AUTOMATION_RULES.find((rule) => rule.event === type || rule.key === type)?.label ?? type;
}
