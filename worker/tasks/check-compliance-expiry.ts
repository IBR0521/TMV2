import type { Task } from 'graphile-worker';
import { daysUntil, expiryThreshold } from '../../src/domain/fleet';
import { todayInZone } from '../../src/server/clock';
import { serviceDb } from '../db';

/**
 * The daily check for expiring paperwork (docs/spec/spec.md, Event catalog —
 * compliance.expiring: "Daily job: 30 and 7 days before expiry").
 *
 * The job decides *when* there is something to say; worker/rules decides what
 * the card says. It raises an events row like every other automation, so the
 * record of what happened stays in one table and the card is produced by the
 * same pipe a trigger would use.
 *
 * Two things make "one suggestion each, never duplicates" true:
 *  - the dedupe key carries the threshold, so 30 days and 7 days are separate
 *    cards and neither is ever raised twice;
 *  - a document whose card already exists in any state is skipped, so a card
 *    the office dismissed does not come back tomorrow morning.
 *
 * Today is read in each carrier's own zone: a medical card expiring on the
 * 30th expires on the 30th at their office, not in UTC.
 */
type Subject = 'driver' | 'truck' | 'trailer';

export type Candidate = {
  documentId: string;
  kind: string;
  expiresOn: string;
  daysLeft: number;
  threshold: number;
  subject: Subject;
  subjectId: string;
  dedupeKey: string;
};

const NAME_SOURCE: Record<Subject, { table: 'drivers' | 'trucks' | 'trailers'; column: string }> = {
  driver: { table: 'drivers', column: 'name' },
  truck: { table: 'trucks', column: 'unit_number' },
  trailer: { table: 'trailers', column: 'unit_number' },
};

async function namesFor(
  companyId: string,
  subject: Subject,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const source = NAME_SOURCE[subject];
  const { data, error } = await serviceDb()
    .from(source.table)
    .select(`id, ${source.column}`)
    .eq('company_id', companyId)
    .in('id', ids);

  if (error) throw new Error(`${source.table} names: ${error.message}`);

  return new Map(
    (data as unknown as Record<string, string>[]).map((row) => {
      const name = row[source.column] ?? '';
      return [row.id as string, subject === 'driver' ? name : `Unit ${name}`] as const;
    }),
  );
}

export function candidatesFor(
  documents: {
    id: string;
    kind: string;
    expires_on: string | null;
    driver_id: string | null;
    truck_id: string | null;
    trailer_id: string | null;
  }[],
  today: string,
): Candidate[] {
  const out: Candidate[] = [];

  for (const document of documents) {
    if (document.expires_on === null) continue;

    const daysLeft = daysUntil(document.expires_on, today);
    const threshold = expiryThreshold(daysLeft);
    if (threshold === null) continue;

    const subject: Subject | null =
      document.driver_id !== null
        ? 'driver'
        : document.truck_id !== null
          ? 'truck'
          : document.trailer_id !== null
            ? 'trailer'
            : null;
    const subjectId = document.driver_id ?? document.truck_id ?? document.trailer_id;
    if (subject === null || subjectId === null) continue;

    out.push({
      documentId: document.id,
      kind: document.kind,
      expiresOn: document.expires_on,
      daysLeft,
      threshold,
      subject,
      subjectId,
      dedupeKey: `compliance.expiring:${document.id}:${threshold}`,
    });
  }

  return out;
}

export const checkComplianceExpiry: Task = async (_payload, helpers) => {
  const db = serviceDb();

  const { data: companies, error: companiesError } = await db
    .from('companies')
    .select('id, timezone')
    .is('archived_at', null);

  if (companiesError) throw new Error(`companies: ${companiesError.message}`);
  if (!companies || companies.length === 0) return;

  let raised = 0;

  for (const company of companies) {
    const { data: documents, error } = await db
      .from('compliance_documents')
      .select('id, kind, expires_on, driver_id, truck_id, trailer_id')
      .eq('company_id', company.id)
      .not('expires_on', 'is', null);

    if (error) throw new Error(`compliance_documents: ${error.message}`);
    if (!documents || documents.length === 0) continue;

    const candidates = candidatesFor(documents, todayInZone(company.timezone));
    if (candidates.length === 0) continue;

    // A card that already exists, in any state, is left alone: one the office
    // dismissed must not come back tomorrow.
    const { data: already, error: alreadyError } = await db
      .from('suggestions')
      .select('dedupe_key')
      .eq('company_id', company.id)
      .in(
        'dedupe_key',
        candidates.map((candidate) => candidate.dedupeKey),
      );

    if (alreadyError) throw new Error(`suggestions: ${alreadyError.message}`);

    const seen = new Set((already ?? []).map((row) => row.dedupe_key));
    const fresh = candidates.filter((candidate) => !seen.has(candidate.dedupeKey));
    if (fresh.length === 0) continue;

    const names = new Map<string, string>();
    for (const subject of ['driver', 'truck', 'trailer'] as const) {
      const ids = fresh
        .filter((candidate) => candidate.subject === subject)
        .map((candidate) => candidate.subjectId);
      for (const [id, name] of await namesFor(company.id, subject, [...new Set(ids)])) {
        names.set(id, name);
      }
    }

    for (const candidate of fresh) {
      const { data: event, error: eventError } = await db
        .from('events')
        .insert({
          company_id: company.id,
          type: 'compliance.expiring',
          subject_type: candidate.subject,
          subject_id: candidate.subjectId,
          actor_type: 'system',
          job_queued: true,
          payload: {
            documentId: candidate.documentId,
            kind: candidate.kind,
            daysLeft: candidate.daysLeft,
            threshold: candidate.threshold,
            expiresOn: candidate.expiresOn,
            subjectKind: candidate.subject,
            subjectName: names.get(candidate.subjectId) ?? 'A unit',
          },
        })
        .select('id')
        .single();

      if (eventError) throw new Error(`events: ${eventError.message}`);

      await helpers.addJob('process_event', {
        event_id: event.id,
        company_id: company.id,
        type: 'compliance.expiring',
      });
      raised += 1;
    }
  }

  if (raised > 0) helpers.logger.info(`compliance expiry: raised ${raised} event(s)`);
};
