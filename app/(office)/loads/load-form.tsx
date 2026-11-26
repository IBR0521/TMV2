'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select, Textarea } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { saveLoad } from '@/server/actions/loads';

/**
 * One form for a new load and for editing one (CLAUDE.md rule 7).
 *
 * It covers what a load is, not what happens to it: the stops, the charges and
 * the status all live on the load page, because a load with no stops is a
 * perfectly good draft and pretending otherwise would make the form refuse
 * the first thing a dispatcher wants to do with a rate con.
 */
export type LoadDraft = {
  id: string;
  customerId: string | null;
  brokerRef: string | null;
  totalMiles: number | null;
  emptyMiles: number | null;
  notes: string | null;
};

export function LoadForm({
  load,
  customers,
}: {
  load?: LoadDraft;
  customers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState(load?.customerId ?? '');
  const [brokerRef, setBrokerRef] = useState(load?.brokerRef ?? '');
  const [totalMiles, setTotalMiles] = useState(
    load?.totalMiles === null || load?.totalMiles === undefined ? '' : String(load.totalMiles),
  );
  const [emptyMiles, setEmptyMiles] = useState(
    load?.emptyMiles === null || load?.emptyMiles === undefined ? '' : String(load.emptyMiles),
  );
  const [notes, setNotes] = useState(load?.notes ?? '');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveLoad({
        id: load?.id,
        customerId,
        brokerRef,
        totalMiles,
        emptyMiles,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (load === undefined) router.push(`/loads/${result.data.loadId}`);
      else router.refresh();
    });
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <>
      <FormGrid>
        <Field label="Customer" error={first('customerId') ?? general}>
          <Select
            value={customerId}
            aria-label="Customer"
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Not chosen yet</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Broker reference"
          hint="Their number for this load. Two rate cons with the same one are the same load."
          error={first('brokerRef')}
        >
          <Input
            value={brokerRef}
            onChange={(event) => setBrokerRef(event.target.value)}
            placeholder="NL-883102"
            aria-label="Broker reference"
          />
        </Field>

        <Field
          label="Total miles"
          hint="Typed in until the routing server arrives in phase 7."
          error={first('totalMiles')}
        >
          <Input
            value={totalMiles}
            onChange={(event) => setTotalMiles(event.target.value)}
            placeholder="790"
            aria-label="Total miles"
          />
        </Field>

        <Field label="Empty miles" hint="Deadhead to the pickup." error={first('emptyMiles')}>
          <Input
            value={emptyMiles}
            onChange={(event) => setEmptyMiles(event.target.value)}
            placeholder="42"
            aria-label="Empty miles"
          />
        </Field>
      </FormGrid>

      <FormGrid columns={1}>
        <Field label="Notes" hint="What dispatch needs to remember about this one." error={first('notes')}>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Reefer at 34F. Lumper paid by the broker."
            aria-label="Notes"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button href={load === undefined ? '/loads' : `/loads/${load.id}`}>Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : load === undefined ? 'Create load' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
