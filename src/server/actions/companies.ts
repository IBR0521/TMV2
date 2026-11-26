'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sessionAction } from '../action';
import * as companies from '../services/companies';

/**
 * Thin wrappers, nothing else (CLAUDE.md, Folders). The schema never carries a
 * company_id: the wrapper refuses to build if it does.
 */
const newCompany = z.object({
  name: z.string().trim().min(2, 'Enter the carrier name.').max(120),
  mcNumber: z.string().trim().max(20).optional().default(''),
  dotNumber: z.string().trim().max(20).optional().default(''),
  timezone: z.string().trim().min(3, 'Choose a time zone.').max(60),
});

export const createCompany = sessionAction(newCompany, async (session, input) => {
  const companyId = await companies.createCompany(session, {
    name: input.name,
    mcNumber: input.mcNumber === '' ? null : input.mcNumber,
    dotNumber: input.dotNumber === '' ? null : input.dotNumber,
    timezone: input.timezone,
  });
  revalidatePath('/', 'layout');
  return { companyId };
});
