'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Amount,
  Button,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  ListRow,
  Panel,
  PanelHeader,
  Select,
  StatusChip,
} from '@/ui';
import { CHARGE_KINDS, type ChargeKind, chargeKindLabel } from '@/domain/load';
import { useHydrated } from '@/client/use-hydrated';
import { removeCharge, saveCharge } from '@/server/actions/loads';

/**
 * What a load earns and what it pays out.
 *
 * The rate is the sum of the lines billed to the customer — there is no
 * separate rate field, so the two can never disagree. A line can be billed to
 * the customer, paid to the driver, both (a lumper the broker reimburses) or
 * neither.
 */
export type ChargeView = {
  id: string;
  kind: ChargeKind;
  description: string | null;
  amountCents: number;
  billCustomer: boolean;
  payDriver: boolean;
};

export function Charges({
  loadId,
  charges,
  rateCents,
}: {
  loadId: string;
  charges: ChargeView[];
  rateCents: number;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState<ChargeKind>('linehaul');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [bill, setBill] = useState('customer');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function add() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveCharge({
        loadId,
        kind,
        description,
        amount,
        billCustomer: bill === 'customer' || bill === 'both',
        payDriver: bill === 'driver' || bill === 'both',
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setDescription('');
      setAmount('');
      router.refresh();
    });
  }

  function remove(chargeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCharge({ chargeId, loadId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function who(charge: ChargeView): string {
    if (charge.billCustomer && charge.payDriver) return 'Billed and paid on';
    if (charge.billCustomer) return 'Billed to the customer';
    if (charge.payDriver) return 'Paid to the driver';
    return 'Neither billed nor paid';
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <Panel label="Charges">
      <PanelHeader title="Charges" count={charges.length} />

      {charges.length === 0 ? (
        <EmptyState
          title="Nothing on this load yet"
          hint="The linehaul is the first line. A load cannot be booked without one."
        />
      ) : (
        charges.map((charge) => (
          <ListRow
            key={charge.id}
            label={chargeKindLabel(charge.kind)}
            title={
              <>
                <Amount cents={charge.amountCents} />
                {charge.description === null ? '' : ` · ${charge.description}`}
              </>
            }
            action={
              <>
                <StatusChip tone={charge.billCustomer ? 'normal' : 'idle'}>
                  {who(charge)}
                </StatusChip>
                <Button size="sm" disabled={pending || !ready} onClick={() => remove(charge.id)}>
                  Remove
                </Button>
              </>
            }
          />
        ))
      )}

      {charges.length === 0 ? null : (
        <ListRow
          label="The rate"
          title={
            <>
              <Amount cents={rateCents} /> billed to the customer
            </>
          }
        />
      )}

      <FormGrid>
        <Field label="What for" error={first('kind') ?? general}>
          <Select
            value={kind}
            aria-label="Charge kind"
            onChange={(event) => setKind(event.target.value as ChargeKind)}
          >
            {CHARGE_KINDS.map((value) => (
              <option key={value} value={value}>
                {chargeKindLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Amount" hint="Dollars. A deduction is a minus." error={first('amount')}>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="2712.50"
            aria-label="Amount"
          />
        </Field>

        <Field label="Who it touches" error={first('billCustomer')}>
          <Select value={bill} aria-label="Who it touches" onChange={(event) => setBill(event.target.value)}>
            <option value="customer">Billed to the customer</option>
            <option value="driver">Paid to the driver</option>
            <option value="both">Both</option>
            <option value="neither">Neither</option>
          </Select>
        </Field>

        <Field label="Note" error={first('description')}>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="2 hours over free time at pickup"
            aria-label="Note"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button disabled={pending || !ready} onClick={add}>
          {pending ? 'Saving' : 'Add charge'}
        </Button>
      </FormActions>
    </Panel>
  );
}
