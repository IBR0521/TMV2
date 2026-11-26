'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  COMPLIANCE_KINDS,
  COMPLIANCE_SUBJECTS_LIST,
  DRIVER_STATUSES,
  DRIVER_TYPES,
  TRAILER_TYPES,
  UNIT_STATUSES,
  normalisePhone,
  normaliseUnitNumber,
  normaliseVin,
} from '@/domain/fleet';
import { action } from '../action';
import * as fleet from '../services/fleet';

/**
 * Thin wrappers, nothing else (CLAUDE.md, Folders). No schema here carries a
 * company_id — the wrapper refuses to build if one does.
 *
 * All three office roles may keep the fleet: that is exactly who sees the
 * Fleet section in src/ui/navigation.ts, and nothing in the brief asks for a
 * finer split.
 */
const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

/** An empty optional field means "not known", not "invalid". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value));

const phone = z
  .string()
  .trim()
  .max(32)
  .optional()
  .default('')
  .refine(
    (raw) => raw === '' || normalisePhone(raw) !== null,
    'Enter a US phone number, for example (214) 555-0142.',
  )
  .transform((raw) => (raw === '' ? null : normalisePhone(raw)));

const vin = z
  .string()
  .trim()
  .max(24)
  .optional()
  .default('')
  .refine((raw) => raw === '' || normaliseVin(raw) !== null, 'A VIN is 17 characters, with no I, O or Q.')
  .transform((raw) => (raw === '' ? null : normaliseVin(raw)));

const expiresOn = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine(
    (raw) => raw === '' || /^\d{4}-\d{2}-\d{2}$/.test(raw),
    'Enter the expiry date as a date.',
  )
  .transform((raw) => (raw === '' ? null : raw));

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------
const driverForm = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, 'Enter the driver’s name.').max(120),
  phone,
  type: z.enum(DRIVER_TYPES),
  status: z.enum(DRIVER_STATUSES).optional().default('active'),
  homeLocation: optionalText(120),
});

export const saveDriver = action(driverForm, OFFICE, async (ctx, input) => {
  const driverId = await fleet.saveDriver(ctx, {
    id: input.id,
    name: input.name,
    phone: input.phone,
    type: input.type,
    status: input.status,
    homeLocation: input.homeLocation,
  });
  revalidatePath('/fleet');
  revalidatePath(`/fleet/drivers/${driverId}`);
  return { driverId };
});

export const archiveDriver = action(
  z.object({ driverId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await fleet.archiveDriver(ctx, input.driverId);
    revalidatePath('/fleet');
    return { archived: true };
  },
);

// ---------------------------------------------------------------------------
// Trucks
// ---------------------------------------------------------------------------
const truckForm = z.object({
  id: z.uuid().optional(),
  unitNumber: z
    .string()
    .trim()
    .min(1, 'Enter the unit number.')
    .max(24)
    .transform(normaliseUnitNumber),
  vin,
  plate: optionalText(32),
  status: z.enum(UNIT_STATUSES).optional().default('active'),
  odometerMiles: z
    .union([z.number(), z.string()])
    .optional()
    .default('')
    .transform((raw) => {
      if (typeof raw === 'number') return raw;
      const cleaned = raw.trim().replace(/,/g, '');
      return cleaned === '' ? null : Number(cleaned);
    })
    .refine(
      (value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 3_000_000),
      'Enter the odometer as whole miles.',
    ),
  ownerDriverId: z
    .union([z.uuid(), z.literal('')])
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value)),
});

export const saveTruck = action(truckForm, OFFICE, async (ctx, input) => {
  const truckId = await fleet.saveTruck(ctx, {
    id: input.id,
    unitNumber: input.unitNumber,
    vin: input.vin,
    plate: input.plate,
    status: input.status,
    odometerMiles: input.odometerMiles,
    ownerDriverId: input.ownerDriverId,
  });
  revalidatePath('/fleet/units');
  revalidatePath(`/fleet/units/${truckId}`);
  return { truckId };
});

export const archiveTruck = action(z.object({ truckId: z.uuid() }), OFFICE, async (ctx, input) => {
  await fleet.archiveTruck(ctx, input.truckId);
  revalidatePath('/fleet/units');
  return { archived: true };
});

// ---------------------------------------------------------------------------
// Trailers
// ---------------------------------------------------------------------------
const trailerForm = z.object({
  id: z.uuid().optional(),
  unitNumber: z
    .string()
    .trim()
    .min(1, 'Enter the trailer number.')
    .max(24)
    .transform(normaliseUnitNumber),
  type: z.enum(TRAILER_TYPES).optional().default('dry_van'),
  status: z.enum(UNIT_STATUSES).optional().default('active'),
});

export const saveTrailer = action(trailerForm, OFFICE, async (ctx, input) => {
  const trailerId = await fleet.saveTrailer(ctx, {
    id: input.id,
    unitNumber: input.unitNumber,
    type: input.type,
    status: input.status,
  });
  revalidatePath('/fleet/units');
  return { trailerId };
});

export const archiveTrailer = action(
  z.object({ trailerId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await fleet.archiveTrailer(ctx, input.trailerId);
    revalidatePath('/fleet/units');
    return { archived: true };
  },
);

// ---------------------------------------------------------------------------
// Compliance documents
// ---------------------------------------------------------------------------
const documentForm = z.object({
  id: z.uuid().optional(),
  subject: z.enum(COMPLIANCE_SUBJECTS_LIST),
  subjectId: z.uuid(),
  kind: z.enum(COMPLIANCE_KINDS),
  expiresOn,
  fileId: z
    .union([z.uuid(), z.literal('')])
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value)),
  note: optionalText(300),
});

export const saveComplianceDocument = action(documentForm, OFFICE, async (ctx, input) => {
  const documentId = await fleet.saveComplianceDocument(ctx, {
    id: input.id,
    subject: input.subject,
    subjectId: input.subjectId,
    kind: input.kind,
    expiresOn: input.expiresOn,
    fileId: input.fileId,
    note: input.note,
  });
  revalidatePath('/fleet');
  return { documentId };
});

export const removeComplianceDocument = action(
  z.object({ documentId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await fleet.removeComplianceDocument(ctx, input.documentId);
    revalidatePath('/fleet');
    return { removed: true };
  },
);
