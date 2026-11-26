'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isUsTimezone } from '@/domain/facilities';
import { action } from '../action';
import * as facilities from '../services/facilities';

/** Thin wrappers. The company comes from the session, never from the form. */
const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

const facilityForm = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, 'Enter what this place is called.').max(160),
  address: z.string().trim().min(5, 'Enter the street address.').max(300),
  timezone: z
    .string()
    .trim()
    .refine(isUsTimezone, 'Choose one of the US time zones.'),
  detentionFreeMinutes: z
    .union([z.number(), z.string()])
    .optional()
    .default(120)
    .transform((raw) => {
      if (typeof raw === 'number') return raw;
      const digits = raw.replace(/\D/g, '');
      return digits === '' ? Number.NaN : Number(digits);
    })
    .refine(
      (value) => Number.isInteger(value) && value >= 0 && value <= 1440,
      'Enter the free time in minutes, up to 1440.',
    ),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value)),
});

export const saveFacility = action(facilityForm, OFFICE, async (ctx, input) => {
  const facilityId = await facilities.saveFacility(ctx, {
    id: input.id,
    name: input.name,
    address: input.address,
    timezone: input.timezone,
    detentionFreeMinutes: input.detentionFreeMinutes,
    notes: input.notes,
  });
  revalidatePath('/customers/facilities');
  return { facilityId };
});

/**
 * Where the geocoder missed and somebody dragged the pin instead. Marked
 * manual by the service, so no later job overwrites it.
 */
export const placeFacilityPin = action(
  z.object({
    facilityId: z.uuid(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  OFFICE,
  async (ctx, input) => {
    await facilities.placeFacilityPin(ctx, input.facilityId, input.lat, input.lng);
    revalidatePath('/customers/facilities');
    return { placed: true };
  },
);

export const archiveFacility = action(
  z.object({ facilityId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await facilities.archiveFacility(ctx, input.facilityId);
    revalidatePath('/customers/facilities');
    return { archived: true };
  },
);
