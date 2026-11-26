'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { COMPLIANCE_KINDS, COMPLIANCE_SUBJECTS_LIST } from '@/domain/fleet';
import { action } from '../action';
import * as documents from '../services/documents';
import * as fleet from '../services/fleet';

/** Thin wrappers. The company comes from the session, never from the form. */
const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

const mime = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);
const sizeBytes = z.number().int().positive().max(documents.MAX_BYTES);

/**
 * Where to put a file. The browser does not choose: it asks, uploads to the
 * path it is given, and then asks for the row to be made.
 */
export const requestUpload = action(
  z.object({ mime, sizeBytes }),
  OFFICE,
  async (ctx, input) => documents.requestUpload(ctx, input.mime, input.sizeBytes),
);

export const attachDocument = action(
  z.object({
    path: z.string().trim().min(1).max(300),
    mime,
    sizeBytes,
    subject: z.enum(COMPLIANCE_SUBJECTS_LIST),
    subjectId: z.uuid(),
    kind: z.enum(COMPLIANCE_KINDS),
    expiresOn: z
      .string()
      .trim()
      .optional()
      .default('')
      .refine((raw) => raw === '' || /^\d{4}-\d{2}-\d{2}$/.test(raw), 'Enter the expiry as a date.')
      .transform((raw) => (raw === '' ? null : raw)),
    note: z
      .string()
      .trim()
      .max(300)
      .optional()
      .default('')
      .transform((value) => (value === '' ? null : value)),
  }),
  OFFICE,
  async (ctx, input) => {
    const documentId = await documents.attachDocument(ctx, {
      path: input.path,
      mime: input.mime,
      sizeBytes: input.sizeBytes,
      subject: input.subject,
      subjectId: input.subjectId,
      kind: input.kind,
      expiresOn: input.expiresOn,
      note: input.note,
    });

    revalidatePath('/fleet');
    return { documentId };
  },
);

/** A link good for five minutes, signed through the caller's own client. */
export const openDocument = action(
  z.object({ fileId: z.uuid() }),
  OFFICE,
  async (ctx, input) => ({ url: await documents.viewUrl(ctx, input.fileId) }),
);

/**
 * Take a document off a driver or a unit: the row first, then the stored
 * object, so nothing is left pointing at a file that is gone.
 */
export const removeDocument = action(
  z.object({
    documentId: z.uuid(),
    fileId: z
      .union([z.uuid(), z.literal('')])
      .optional()
      .default('')
      .transform((value) => (value === '' ? null : value)),
  }),
  OFFICE,
  async (ctx, input) => {
    await fleet.removeComplianceDocument(ctx, input.documentId);
    if (input.fileId !== null) await documents.removeFile(ctx, input.fileId);

    revalidatePath('/fleet');
    return { removed: true };
  },
);
