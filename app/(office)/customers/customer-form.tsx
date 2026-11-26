'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select } from '@/ui';
import {
  CUSTOMER_TYPES,
  SEND_MODES,
  customerTypeLabel,
  sendModeLabel,
} from '@/domain/customers';
import type { CustomerType, SendMode } from '@/domain/customers';
import { useHydrated } from '@/client/use-hydrated';
import { saveCustomer } from '@/server/actions/customers';

/** One form for a new customer and for editing one (CLAUDE.md rule 7). */
export type CustomerDraft = {
  id: string;
  name: string;
  type: CustomerType;
  mcNumber: string | null;
  billingEmail: string | null;
  paymentTermsDays: number;
  sendMode: SendMode;
};

export function CustomerForm({ customer }: { customer?: CustomerDraft }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(customer?.name ?? '');
  const [type, setType] = useState<CustomerType>(customer?.type ?? 'broker');
  const [mcNumber, setMcNumber] = useState(customer?.mcNumber ?? '');
  const [billingEmail, setBillingEmail] = useState(customer?.billingEmail ?? '');
  const [paymentTermsDays, setPaymentTermsDays] = useState(
    String(customer?.paymentTermsDays ?? 30),
  );
  const [sendMode, setSendMode] = useState<SendMode>(customer?.sendMode ?? 'email');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveCustomer({
        id: customer?.id,
        name,
        type,
        mcNumber,
        billingEmail,
        paymentTermsDays,
        sendMode,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (customer === undefined) {
        router.push(`/customers/${result.data.customerId}`);
      } else {
        router.refresh();
      }
    });
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <>
      <FormGrid>
        <Field label="Name" error={first('name') ?? general}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Northline Logistics"
            aria-label="Customer name"
          />
        </Field>

        <Field label="Type" error={first('type')}>
          <Select
            value={type}
            aria-label="Customer type"
            onChange={(event) => setType(event.target.value as CustomerType)}
          >
            {CUSTOMER_TYPES.map((value) => (
              <option key={value} value={value}>
                {customerTypeLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="MC number" hint="Brokers only. Digits are enough." error={first('mcNumber')}>
          <Input
            value={mcNumber}
            onChange={(event) => setMcNumber(event.target.value)}
            placeholder="883102"
            aria-label="MC number"
          />
        </Field>

        <Field
          label="Billing email"
          hint="Where the invoice goes from phase 5."
          error={first('billingEmail')}
        >
          <Input
            value={billingEmail}
            onChange={(event) => setBillingEmail(event.target.value)}
            placeholder="ap@northline.com"
            aria-label="Billing email"
          />
        </Field>

        <Field label="Payment terms" hint="Days. 0 means due on receipt." error={first('paymentTermsDays')}>
          <Input
            value={paymentTermsDays}
            onChange={(event) => setPaymentTermsDays(event.target.value)}
            placeholder="30"
            aria-label="Payment terms in days"
          />
        </Field>

        <Field label="How they get the invoice" error={first('sendMode')}>
          <Select
            value={sendMode}
            aria-label="How they get the invoice"
            onChange={(event) => setSendMode(event.target.value as SendMode)}
          >
            {SEND_MODES.map((value) => (
              <option key={value} value={value}>
                {sendModeLabel(value)}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      <FormActions>
        <Button href="/customers">Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : customer === undefined ? 'Add customer' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
