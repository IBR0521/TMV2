'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { IMPORT_KINDS } from '@/domain/spreadsheet';
import { action } from '../action';
import * as imports from '../services/imports';

/** Thin wrappers. The company comes from the session, never from the sheet. */
const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

/**
 * The browser sends the cells it read and which column it decided is which.
 * It does not send values it has already interpreted: the service runs the
 * same pure functions the preview ran, so the server is the authority and the
 * preview is only a preview.
 */
const sheet = z.object({
  kind: z.enum(IMPORT_KINDS),
  mapping: z.record(z.string().max(200), z.string().max(60)),
  rows: z
    .array(z.record(z.string().max(200), z.string().max(2_000)))
    .min(1, 'That sheet has no rows in it.')
    .max(imports.MAX_ROWS, `Import at most ${imports.MAX_ROWS} rows at a time.`),
});

export const importSheet = action(sheet, OFFICE, async (ctx, input) => {
  const outcome = await imports.importSheet(ctx, input.kind, input.mapping, input.rows);

  revalidatePath('/fleet');
  revalidatePath('/fleet/units');
  revalidatePath('/customers');

  return outcome;
});

export const rememberedColumns = action(
  z.object({ kind: z.enum(IMPORT_KINDS) }),
  OFFICE,
  async (ctx, input) => ({ mapping: await imports.getMapping(ctx, input.kind) }),
);
