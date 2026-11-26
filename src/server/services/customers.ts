import type { CustomerType, SendMode } from '@/domain/customers';
import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

/**
 * Customers: the brokers and shippers that pay for a load, and the people at
 * them worth phoning.
 *
 * ctx carries the company; input never does. Archived, never deleted — a
 * broker on last year's invoices has to stay readable.
 */
export type CustomerRow = {
  id: string;
  name: string;
  type: CustomerType;
  mcNumber: string | null;
  billingEmail: string | null;
  paymentTermsDays: number;
  sendMode: SendMode;
  contactCount: number;
};

export type ContactRow = {
  id: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export async function listCustomers(ctx: Ctx): Promise<CustomerRow[]> {
  const [customers, contacts] = await Promise.all([
    ctx.db
      .from('customers')
      .select('id, name, type, mc_number, billing_email, payment_terms_days, send_mode')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .order('name', { ascending: true }),
    ctx.db.from('customer_contacts').select('customer_id').eq('company_id', ctx.companyId),
  ]);

  if (customers.error) fail(customers.error, 'The customers could not be read.');
  if (contacts.error) fail(contacts.error, 'The contacts could not be read.');

  const counts = new Map<string, number>();
  for (const row of contacts.data) {
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }

  return customers.data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    mcNumber: row.mc_number,
    billingEmail: row.billing_email,
    paymentTermsDays: row.payment_terms_days,
    sendMode: row.send_mode,
    contactCount: counts.get(row.id) ?? 0,
  }));
}

export async function getCustomer(ctx: Ctx, customerId: string): Promise<CustomerRow | null> {
  const { data, error } = await ctx.db
    .from('customers')
    .select('id, name, type, mc_number, billing_email, payment_terms_days, send_mode')
    .eq('company_id', ctx.companyId)
    .eq('id', customerId)
    .maybeSingle();

  if (error) fail(error, 'That customer could not be read.');
  if (data === null) return null;

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    mcNumber: data.mc_number,
    billingEmail: data.billing_email,
    paymentTermsDays: data.payment_terms_days,
    sendMode: data.send_mode,
    contactCount: 0,
  };
}

export type CustomerInput = {
  id?: string;
  name: string;
  type: CustomerType;
  mcNumber: string | null;
  billingEmail: string | null;
  paymentTermsDays: number;
  sendMode: SendMode;
};

export async function saveCustomer(ctx: Ctx, input: CustomerInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    name: input.name,
    type: input.type,
    mc_number: input.mcNumber,
    billing_email: input.billingEmail,
    payment_terms_days: input.paymentTermsDays,
    send_mode: input.sendMode,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('customers').insert(row).select('id').single();
    if (error) fail(error, 'That customer could not be added.');
    await audit.record(ctx, {
      action: 'customer.created',
      subjectType: 'customer',
      subjectId: data.id,
      after: row,
    });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('customers')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That customer could not be saved.');
  if (data === null) throw new ActionError('That customer no longer exists.');

  await audit.record(ctx, {
    action: 'customer.updated',
    subjectType: 'customer',
    subjectId: data.id,
    after: row,
  });
  return data.id;
}

export async function archiveCustomer(ctx: Ctx, customerId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('customers')
    .update({ archived_at: new Date().toISOString() })
    .eq('company_id', ctx.companyId)
    .eq('id', customerId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That customer could not be archived.');
  if (data === null) throw new ActionError('That customer no longer exists.');

  await audit.record(ctx, {
    action: 'customer.archived',
    subjectType: 'customer',
    subjectId: customerId,
  });
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------
export async function listContacts(ctx: Ctx, customerId: string): Promise<ContactRow[]> {
  const { data, error } = await ctx.db
    .from('customer_contacts')
    .select('id, customer_id, name, email, phone')
    .eq('company_id', ctx.companyId)
    .eq('customer_id', customerId)
    .order('name', { ascending: true });

  if (error) fail(error, 'The contacts could not be read.');

  return data.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
  }));
}

export type ContactInput = {
  id?: string;
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export async function saveContact(ctx: Ctx, input: ContactInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    customer_id: input.customerId,
    name: input.name,
    email: input.email,
    phone: input.phone,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db
      .from('customer_contacts')
      .insert(row)
      .select('id')
      .single();
    if (error) fail(error, 'That contact could not be added.');
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('customer_contacts')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That contact could not be saved.');
  if (data === null) throw new ActionError('That contact no longer exists.');
  return data.id;
}

/** A person who left is removed, not archived: a contact is not a record of business. */
export async function removeContact(ctx: Ctx, contactId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('customer_contacts')
    .delete()
    .eq('company_id', ctx.companyId)
    .eq('id', contactId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That contact could not be removed.');
  if (data === null) throw new ActionError('That contact no longer exists.');
}
