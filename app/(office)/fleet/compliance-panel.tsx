'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  ListRow,
  Select,
  StatusChip,
} from '@/ui';
import { complianceKindLabel, complianceKindsFor } from '@/domain/fleet';
import type { ComplianceKind, ComplianceSubject } from '@/domain/fleet';
import { useHydrated } from '@/client/use-hydrated';
import { removeComplianceDocument, saveComplianceDocument } from '@/server/actions/fleet';

/**
 * Expiring paperwork for a driver, a truck or a trailer: what is on file and
 * when it runs out. One panel for all three, because the only difference is
 * which kinds of document the form offers — and the domain decides that.
 *
 * The scan itself arrives with uploads later in this phase. A row is already
 * the kind, the date and a note, which is exactly what the daily expiry rule
 * reads, so the rule can be built and tested before any file exists.
 */
export type PaperworkRow = {
  id: string;
  kind: ComplianceKind;
  expiresOn: string | null;
  /** The expiry in words, or null when it is months away and not worth a chip. */
  label: string | null;
  tone: 'warning' | 'idle';
  note: string | null;
};

export function CompliancePanel({
  subject,
  subjectId,
  documents,
}: {
  subject: ComplianceSubject;
  subjectId: string;
  documents: PaperworkRow[];
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const kinds = complianceKindsFor(subject);
  const [kind, setKind] = useState<ComplianceKind>(kinds[0] ?? 'registration');
  const [expiresOn, setExpiresOn] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await saveComplianceDocument({ subject, subjectId, kind, expiresOn, note });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setExpiresOn('');
      setNote('');
      router.refresh();
    });
  }

  function remove(documentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeComplianceDocument({ documentId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function title(document: PaperworkRow): string {
    const parts = [
      document.expiresOn === null ? 'No expiry' : `Expires ${document.expiresOn}`,
      document.note,
    ].filter((part): part is string => part !== null && part !== '');
    return parts.join(' · ');
  }

  return (
    <>
      {documents.length === 0 ? (
        <EmptyState
          title="No paperwork on file"
          hint={
            subject === 'driver'
              ? 'Add a CDL or a medical card with its expiry date.'
              : 'Add the registration, insurance or annual inspection.'
          }
        />
      ) : (
        documents.map((document) => (
          <ListRow
            key={document.id}
            label={complianceKindLabel(document.kind)}
            title={title(document)}
            action={
              <>
                {document.label === null ? null : (
                  <StatusChip tone={document.tone} dot={document.tone === 'warning'}>
                    {document.label}
                  </StatusChip>
                )}
                <Button size="sm" disabled={pending || !ready} onClick={() => remove(document.id)}>
                  Remove
                </Button>
              </>
            }
          />
        ))
      )}

      <FormGrid columns={1}>
        <Field label="Document" error={error ?? undefined}>
          <Select
            value={kind}
            aria-label="Document kind"
            onChange={(event) => setKind(event.target.value as ComplianceKind)}
          >
            {kinds.map((value) => (
              <option key={value} value={value}>
                {complianceKindLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Expires" hint="Leave empty if it does not expire.">
          <Input
            type="date"
            value={expiresOn}
            onChange={(event) => setExpiresOn(event.target.value)}
            aria-label="Expiry date"
          />
        </Field>

        <Field label="Note">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={subject === 'driver' ? 'Class A, hazmat' : 'Annual, state of Texas'}
            aria-label="Note"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button disabled={pending || !ready} onClick={add}>
          {pending ? 'Saving' : 'Add document'}
        </Button>
      </FormActions>
    </>
  );
}
