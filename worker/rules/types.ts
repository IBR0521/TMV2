import type { DriverCandidate } from '../../src/domain/dispatch';
import type { StopDwell } from '../facts/stop-dwell';
import type { Json } from '../../src/server/db/database.types';

/**
 * A rule is a small pure function: event in, actions out (CLAUDE.md, rule 4).
 * It never touches the database, so it can be tested with a plain object.
 */
export type WorkerEvent = {
  id: string;
  companyId: string;
  type: string;
  subjectType: string;
  subjectId: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
};

/**
 * What a rule asks for. Phase 1 only needs a card on Today; the "auto" variant
 * joins this union in phase 3, when there are real actions to take.
 */
export type RuleAction = {
  kind: 'suggest';
  /** Suggestion type, usually the event type. */
  type: string;
  title: string;
  detail?: string;
  /** One open card per thing: the same key updates the card in place. */
  dedupeKey: string;
  subjectType?: string;
  subjectId?: string | null;
  /** The service the Accept button runs, with these parameters. */
  actionName?: string;
  actionParams?: Json;
};

/**
 * Facts a rule cannot look up for itself.
 *
 * A rule is a pure function — event in, actions out — so it cannot read the
 * database, and some decisions need more than the row that changed. Naming
 * what it needs lets the task fetch it and hand it over, which keeps the
 * database access in worker/tasks where it belongs and keeps the rule
 * testable with a plain object.
 */
export type RuleFacts = {
  candidates?: DriverCandidate[];
  pickup?: { lat: number; lng: number } | null;
  dwell?: StopDwell;
};

export type Rule = {
  /** Matches a key in src/domain/automation.ts. */
  key: string;
  /** What the task should fetch before calling handle. */
  needs?: 'driver_candidates' | 'stop_dwell';
  handle: (event: WorkerEvent, facts?: RuleFacts) => RuleAction[];
};
