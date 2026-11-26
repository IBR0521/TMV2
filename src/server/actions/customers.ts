'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  CUSTOMER_TYPES,
  MAX_PAYMENT_TERMS_DAYS,
  SEND_MODES,
  normaliseEmail,
  normaliseMcNumber,
} from '@/domain/customers';
import { normalisePhone } from '@/domain/fleet';
import { action } from '../action';
import * as customers from '../services/customers';

/** Thin wrappers. The company comes from the session, never from the form. */
const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default('')
    .transform((value) => (value === '' ? null : value));

const email = z
  .string()
  .trim()
  .max(160)
  .optional()
  .default('')
  .refine((raw) => raw === '' || normaliseEmail(raw) !== null, 'Enter an email address.')
  .transform((raw) => (raw === '' ? null : normaliseEmail(raw)));

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

const mcNumber = z
  .string()
  .trim()
  .max(20)
  .optional()
  .default('')
  .refine((raw) => raw === '' || normaliseMcNumber(raw) !== null, 'An MC number is 4 to 8 digits.')
  .transform((raw) => (raw === '' ? null : normaliseMcNumber(raw)));

const customerForm = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, 'Enter the customer’s name.').max(160),
  type: z.enum(CUSTOMER_TYPES).optional().default('broker'),
  mcNumber,
  billingEmail: email,
  paymentTermsDays: z
    .union([z.number(), z.string()])
    .optional()
    .default(30)
    .transform((raw) => {
      if (typeof raw === 'number') return raw;
      const digits = raw.replace(/\D/g, '');
      return digits === '' ? Number.NaN : Number(digits);
    })
    .refine(
      (value) => Number.isInteger(value) && value >= 0 && value <= MAX_PAYMENT_TERMS_DAYS,
      `Enter the terms as days, up to ${MAX_PAYMENT_TERMS_DAYS}.`,
    ),
  sendMode: z.enum(SEND_MODES).optional().default('email'),
});

export const saveCustomer = action(customerForm, OFFICE, async (ctx, input) => {
  const customerId = await customers.saveCustomer(ctx, {
    id: input.id,
    name: input.name,
    type: input.type,
    mcNumber: input.mcNumber,
    billingEmail: input.billingEmail,
    paymentTermsDays: input.paymentTermsDays,
    sendMode: input.sendMode,
  });
  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);
  return { customerId };
});

export const archiveCustomer = action(
  z.object({ customerId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await customers.archiveCustomer(ctx, input.customerId);
    revalidatePath('/customers');
    return { archived: true };
  },
);

const contactForm = z.object({
  id: z.uuid().optional(),
  customerId: z.uuid(),
  name: z.string().trim().min(2, 'Enter the contact’s name.').max(120),
  email,
  phone,
});

export const saveContact = action(contactForm, OFFICE, async (ctx, input) => {
  const contactId = await customers.saveContact(ctx, {
    id: input.id,
    customerId: input.customerId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  revalidatePath(`/customers/${input.customerId}`);
  return { contactId };
});

export const removeContact = action(
  z.object({ contactId: z.uuid() }),
  OFFICE,
  async (ctx, input) => {
    await customers.removeContact(ctx, input.contactId);
    revalidatePath('/customers');
    return { removed: true };
  },
);
