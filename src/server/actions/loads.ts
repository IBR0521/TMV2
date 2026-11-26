'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CHARGE_KINDS, LOAD_STATUSES, parseMoneyToCents } from '@/domain/load';
import { action } from '../action';
import * as loads from '../services/loads';

/**
 * Thin wrappers. No schema here carries a company_id — the wrapper refuses to
 * build if one does — and no schema decides anything about a load's status:
 * that is src/domain/load.ts, through the service.
 *
 * Dispatchers and owners move loads. Accounting sees the Loads section in the
 * menu and can read them, but putting a truck on the road is not their job.
 */
const DISPATCH = ['owner', 'dispatcher'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value));

const miles = z
  .union([z.number(), z.string()])
  .optional()
  .default('')
  .transform((raw) => {
    if (typeof raw === 'number') return raw;
    const cleaned = raw.trim().replace(/,/g, '');
    return cleaned === '' ? null : Number(cleaned);
  })
  .refine(
    (value) => value === null || (Number.isInteger(value) && value >= 0 && value <= 20_000),
    'Enter the miles as a whole number.',
  );

const optionalId = z
  .union([z.uuid(), z.literal('')])
  .optional()
  .default('')
  .transform((value) => (value === '' ? null : value));

export const saveLoad = action(
  z.object({
    id: z.uuid().optional(),
    customerId: optionalId,
    brokerRef: optionalText(60),
    totalMiles: miles,
    emptyMiles: miles,
    notes: optionalText(2_000),
  }),
  DISPATCH,
  async (ctx, input) => {
    const loadId = await loads.saveLoad(ctx, {
      id: input.id,
      customerId: input.customerId,
      brokerRef: input.brokerRef,
      totalMiles: input.totalMiles,
      emptyMiles: input.emptyMiles,
      notes: input.notes,
    });

    revalidatePath('/loads');
    revalidatePath(`/loads/${loadId}`);
    return { loadId };
  },
);

/**
 * The one way a load changes status. The domain decides whether it may and
 * what else happens; a refusal comes back as the sentence it wrote.
 */
export const moveLoad = action(
  z.object({ loadId: z.uuid(), to: z.enum(LOAD_STATUSES) }),
  DISPATCH,
  async (ctx, input) => {
    await loads.moveLoad(ctx, input.loadId, input.to);

    revalidatePath('/loads');
    revalidatePath(`/loads/${input.loadId}`);
    revalidatePath('/dispatch');
    return { status: input.to };
  },
);

export const assignLoad = action(
  z.object({
    loadId: z.uuid(),
    driverId: z.uuid(),
    truckId: z.uuid(),
    trailerId: optionalId,
  }),
  DISPATCH,
  async (ctx, input) => {
    await loads.assign(ctx, input.loadId, input.driverId, input.truckId, input.trailerId);

    revalidatePath('/loads');
    revalidatePath(`/loads/${input.loadId}`);
    revalidatePath('/dispatch');
    return { assigned: true };
  },
);

// ---------------------------------------------------------------------------
// Stops and charges
// ---------------------------------------------------------------------------
const when = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine(
    (raw) => raw === '' || !Number.isNaN(Date.parse(raw)),
    'Enter the appointment as a date and time.',
  )
  .transform((raw) => (raw === '' ? null : new Date(raw).toISOString()));

export const saveStop = action(
  z.object({
    id: z.uuid().optional(),
    loadId: z.uuid(),
    seq: z.coerce.number().int().min(1).max(50),
    type: z.enum(['pickup', 'delivery']),
    facilityId: optionalId,
    apptStart: when,
    apptEnd: when,
    reference: optionalText(60),
    notes: optionalText(1_000),
  }),
  DISPATCH,
  async (ctx, input) => {
    const stopId = await loads.saveStop(ctx, {
      id: input.id,
      loadId: input.loadId,
      seq: input.seq,
      type: input.type,
      facilityId: input.facilityId,
      apptStart: input.apptStart,
      apptEnd: input.apptEnd,
      reference: input.reference,
      notes: input.notes,
    });

    revalidatePath(`/loads/${input.loadId}`);
    return { stopId };
  },
);

export const removeStop = action(
  z.object({ stopId: z.uuid(), loadId: z.uuid() }),
  DISPATCH,
  async (ctx, input) => {
    await loads.removeStop(ctx, input.stopId);
    revalidatePath(`/loads/${input.loadId}`);
    return { removed: true };
  },
);

/** Arriving and leaving a stop, entered by the office until the driver app. */
export const markStopTime = action(
  z.object({
    stopId: z.uuid(),
    loadId: z.uuid(),
    field: z.enum(['arrived_at', 'departed_at']),
    at: z
      .string()
      .trim()
      .refine((raw) => !Number.isNaN(Date.parse(raw)), 'Enter a date and time.')
      .transform((raw) => new Date(raw).toISOString()),
  }),
  DISPATCH,
  async (ctx, input) => {
    await loads.markStopTime(ctx, input.stopId, input.field, input.at);
    revalidatePath(`/loads/${input.loadId}`);
    return { marked: true };
  },
);

/**
 * Money arrives as what a person typed — "2,712.00" — and is stored as cents.
 * Nothing here ever holds a float: the string is parsed to cents directly.
 */
const amountCents = z
  .string()
  .trim()
  .min(1, 'Enter an amount.')
  .refine(
    (raw) => parseMoneyToCents(raw) !== null,
    'Enter an amount like 2712 or 2712.50',
  )
  .transform((raw) => parseMoneyToCents(raw) ?? 0);

export const saveCharge = action(
  z.object({
    id: z.uuid().optional(),
    loadId: z.uuid(),
    kind: z.enum(CHARGE_KINDS),
    description: optionalText(200),
    amount: amountCents,
    billCustomer: z.coerce.boolean().optional().default(true),
    payDriver: z.coerce.boolean().optional().default(false),
  }),
  DISPATCH,
  async (ctx, input) => {
    const chargeId = await loads.saveCharge(ctx, {
      id: input.id,
      loadId: input.loadId,
      kind: input.kind,
      description: input.description,
      amountCents: input.amount,
      billCustomer: input.billCustomer,
      payDriver: input.payDriver,
    });

    revalidatePath('/loads');
    revalidatePath(`/loads/${input.loadId}`);
    return { chargeId };
  },
);

export const removeCharge = action(
  z.object({ chargeId: z.uuid(), loadId: z.uuid() }),
  DISPATCH,
  async (ctx, input) => {
    await loads.removeCharge(ctx, input.chargeId);
    revalidatePath('/loads');
    revalidatePath(`/loads/${input.loadId}`);
    return { removed: true };
  },
);
