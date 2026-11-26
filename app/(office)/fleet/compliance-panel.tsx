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
import { browserDb } from '@/server/db/browser';
import {
  attachDocument,
  openDocument,
  removeDocument,
  requestUpload,
} from '@/server/actions/documents';
import { saveComplianceDocument } from '@/server/actions/fleet';

/**
 * Expiring paperwork for a driver, a truck or a trailer: what is on file and
 * when it runs out. One panel for all three, because the only difference is
 * which kinds of document the form offers — and the domain decides that.
 *
 * A scan is optional: the expiry date is what the daily rule reads, and a
 * carrier who has the date but not the paperwork to hand should still be able
 * to record it. When there is a file, the browser asks the server where to put
 * it, uploads it there, and then asks for the row — so it never chooses its
 * own path, and the storage policy checks the company folder again anyway.
 */
export type PaperworkRow = {
  id: string;
  kind: ComplianceKind;
  expiresOn: string | null;
  /** The expiry in words, or null when it is months away and not worth a chip. */
  label: string | null;
  tone: 'warning' | 'idle';
  note: string | null;
  fileId: string | null;
};

const UPLOADABLE = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;

type Uploadable = (typeof UPLOADABLE)[number];

/** A browser will report any type it likes; only these five are accepted. */
function asUploadable(mime: string): Uploadable | null {
  return (UPLOADABLE as readonly string[]).includes(mime) ? (mime as Uploadable) : null;
}

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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result =
        file === null
          ? await saveComplianceDocument({ subject, subjectId, kind, expiresOn, note })
          : await withFile(file);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setExpiresOn('');
      setNote('');
      setFile(null);
      router.refresh();
    });
  }

  /**
   * Ask where to put it, upload it there, then ask for the row. If the upload
   * fails nothing is recorded, and if the row fails the server clears up the
   * object it told us to write.
   */
  async function withFile(chosen: File) {
    const mime = asUploadable(chosen.type);
    if (mime === null) {
      return { ok: false as const, error: 'Upload a PDF or a photo.' };
    }

    const target = await requestUpload({ mime, sizeBytes: chosen.size });
    if (!target.ok) return target;

    const sent = await browserDb()
      .storage.from('documents')
      .upload(target.data.path, chosen, { contentType: chosen.type });

    if (sent.error) {
      return { ok: false as const, error: 'That file could not be uploaded. Try again.' };
    }

    return attachDocument({
      path: target.data.path,
      mime,
      sizeBytes: chosen.size,
      subject,
      subjectId,
      kind,
      expiresOn,
      note,
    });
  }

  async function open(fileId: string) {
    setError(null);

    // The tab is opened on the click itself, before the await: a browser only
    // allows a pop-up while it can still see the gesture that asked for it,
    // and signing the link takes a round trip. If pop-ups are blocked the
    // document opens here instead, which the back button undoes.
    const tab = window.open('', '_blank');
    if (tab !== null) tab.opener = null;

    const result = await openDocument({ fileId });

    if (!result.ok) {
      tab?.close();
      setError(result.error);
      return;
    }

    if (tab === null) window.location.assign(result.data.url);
    else tab.location.replace(result.data.url);
  }

  function remove(documentId: string, fileId: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await removeDocument({ documentId, fileId: fileId ?? '' });
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
                {document.fileId === null ? null : (
                  <Button
                    size="sm"
                    disabled={!ready}
                    onClick={() => void open(document.fileId as string)}
                  >
                    View
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={pending || !ready}
                  onClick={() => remove(document.id, document.fileId)}
                >
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

        <Field
          label="Scan or photo"
          hint={file === null ? 'Optional. PDF or a photo, up to 25 MB.' : file.name}
        >
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            aria-label="Scan or photo"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
