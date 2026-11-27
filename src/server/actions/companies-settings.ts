'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normaliseDotNumber, normaliseMcNumber } from '@/domain/customers';
import { isUsTimezone } from '@/domain/facilities';
import { action } from '../action';
import * as companies from '../services/companies';

/**
 * The carrier's own details. Owner only: the time zone decides when a pay week
 * ends and the two rates decide what every load looks like it makes.
 */
const cents = (what: string) =>
  z
    .union([z.number(), z.string()])
    .transform((raw) => {
      if (typeof raw === 'number') return raw;
      const digits = raw.replace(/[^\d]/g, '');
      return digits === '' ? Number.NaN : Number(digits);
    })
    .refine(
      (value) => Number.isInteger(value) && value >= 0 && value <= 500,
      `Enter ${what} as whole cents a mile, up to 500.`,
    );

export const updateCompany = action(
  z.object({
    name: z.string().trim().min(2, 'Enter the carrier name.').max(120),
    mcNumber: z
      .string()
      .trim()
      .max(20)
      .optional()
      .default('')
      .refine((raw) => raw === '' || normaliseMcNumber(raw) !== null, 'An MC number is 4 to 8 digits.')
      .transform((raw) => (raw === '' ? null : normaliseMcNumber(raw))),
    dotNumber: z
      .string()
      .trim()
      .max(20)
      .optional()
      .default('')
      .refine((raw) => raw === '' || normaliseDotNumber(raw) !== null, 'A USDOT number is digits.')
      .transform((raw) => (raw === '' ? null : normaliseDotNumber(raw))),
    timezone: z.string().trim().refine(isUsTimezone, 'Choose one of the US time zones.'),
    driverPayCentsPerMile: cents('driver pay'),
    fuelCentsPerMile: cents('fuel'),
  }),
  ['owner'],
  async (ctx, input) => {
    await companies.updateCompany(ctx, {
      name: input.name,
      mcNumber: input.mcNumber,
      dotNumber: input.dotNumber,
      timezone: input.timezone,
      driverPayCentsPerMile: input.driverPayCentsPerMile,
      fuelCentsPerMile: input.fuelCentsPerMile,
    });

    revalidatePath('/settings/company');
    revalidatePath('/loads');
    return { saved: true };
  },
);
