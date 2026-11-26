import { randomUUID } from 'node:crypto';
import type { ComplianceKind, ComplianceSubject } from '@/domain/fleet';
import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import { saveComplianceDocument } from './fleet';

/**
 * Uploaded documents: the scan behind a compliance row.
 *
 * The browser never chooses where a file goes. It asks for a place, uploads to
 * the path it is given, and then asks for the row to be made. So a client can
 * only ever write where the server told it to, and the storage policy checks
 * the company folder again on top of that.
 *
 * Supabase's standard upload is used rather than the resumable one: these are
 * a photo of a licence or a scanned registration, a few megabytes at most, and
 * resumable uploads earn their keep in phase 4, where a driver's phone is
 * sending a POD from a yard with one bar of signal.
 */
export const BUCKET = 'documents';
export const MAX_BYTES = 26_214_400;

const ALLOWED_MIME: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

export type UploadTarget = { path: string };

/**
 * Where to put a file. The name is ours, not theirs: a carrier's own file name
 * can carry anything, and nothing good comes of putting it in a path.
 */
export function requestUpload(ctx: Ctx, mime: string, sizeBytes: number): UploadTarget {
  if (!ALLOWED_MIME.includes(mime)) {
    throw new ActionError('Upload a PDF or a photo.');
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_BYTES) {
    throw new ActionError('That file is larger than 25 MB.');
  }

  return { path: `${ctx.companyId}/${randomUUID()}.${EXTENSIONS[mime] ?? 'bin'}` };
}

/** The path has to be inside this company's folder, whatever was asked for. */
function assertOurs(ctx: Ctx, path: string): void {
  if (!path.startsWith(`${ctx.companyId}/`)) {
    throw new ActionError('That file does not belong to this carrier.');
  }
}

export type AttachInput = {
  path: string;
  mime: string;
  sizeBytes: number;
  subject: ComplianceSubject;
  subjectId: string;
  kind: ComplianceKind;
  expiresOn: string | null;
  note: string | null;
};

/**
 * Record the uploaded file and hang a compliance row off it.
 *
 * The file row first, because the compliance row points at it. If the second
 * write fails the first is removed again, so an upload never leaves a file
 * nothing refers to.
 */
export async function attachDocument(ctx: Ctx, input: AttachInput): Promise<string> {
  assertOurs(ctx, input.path);
  if (!ALLOWED_MIME.includes(input.mime)) throw new ActionError('Upload a PDF or a photo.');

  const { data: file, error } = await ctx.db
    .from('files')
    .insert({
      company_id: ctx.companyId,
      storage_path: input.path,
      mime: input.mime,
      size_bytes: input.sizeBytes,
      uploaded_by: ctx.userId,
    })
    .select('id')
    .single();

  if (error) fail(error, 'That file could not be recorded.');

  try {
    return await saveComplianceDocument(ctx, {
      subject: input.subject,
      subjectId: input.subjectId,
      kind: input.kind,
      expiresOn: input.expiresOn,
      fileId: file.id,
      note: input.note,
    });
  } catch (problem) {
    await ctx.db.from('files').delete().eq('company_id', ctx.companyId).eq('id', file.id);
    await ctx.db.storage.from(BUCKET).remove([input.path]);
    throw problem;
  }
}

/**
 * A link to look at a document, good for a few minutes.
 *
 * Signed through the caller's own client, so the storage policy decides
 * whether there is anything to sign.
 */
export async function viewUrl(ctx: Ctx, fileId: string): Promise<string> {
  const { data: file, error } = await ctx.db
    .from('files')
    .select('storage_path')
    .eq('company_id', ctx.companyId)
    .eq('id', fileId)
    .maybeSingle();

  if (error) fail(error, 'That file could not be read.');
  if (file === null) throw new ActionError('That file is no longer there.');

  const signed = await ctx.db.storage.from(BUCKET).createSignedUrl(file.storage_path, 300);
  if (signed.error || signed.data === null) {
    throw new ActionError('That file could not be opened.');
  }

  return signed.data.signedUrl;
}

/**
 * Remove the stored object and its file row.
 *
 * The compliance row is removed by the caller first; this clears up what it
 * pointed at, so a document taken off the wrong driver does not leave its scan
 * behind.
 */
export async function removeFile(ctx: Ctx, fileId: string): Promise<void> {
  const { data: file, error } = await ctx.db
    .from('files')
    .select('storage_path')
    .eq('company_id', ctx.companyId)
    .eq('id', fileId)
    .maybeSingle();

  if (error) fail(error, 'That file could not be read.');
  if (file === null) return;

  await ctx.db.storage.from(BUCKET).remove([file.storage_path]);

  const { error: rowError } = await ctx.db
    .from('files')
    .delete()
    .eq('company_id', ctx.companyId)
    .eq('id', fileId);

  if (rowError) fail(rowError, 'That file could not be removed.');
}
