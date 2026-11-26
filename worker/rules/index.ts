import { rulesForEvent } from '../../src/domain/automation';
import { complianceExpiringRule } from './compliance-expiring';
import { testPingRule } from './test-ping';
import type { Rule } from './types';

/**
 * Every rule, by key. src/domain/automation.ts says which event a key listens
 * for and the mode it runs in by default; this says what it does.
 */
const RULES: readonly Rule[] = [testPingRule, complianceExpiringRule];

export function ruleByKey(key: string): Rule | undefined {
  return RULES.find((rule) => rule.key === key);
}

/** The rules listening for an event type, in catalogue order. */
export function rulesListeningFor(eventType: string): Rule[] {
  return rulesForEvent(eventType)
    .map((entry) => ruleByKey(entry.key))
    .filter((rule): rule is Rule => rule !== undefined);
}

export { RULES };
