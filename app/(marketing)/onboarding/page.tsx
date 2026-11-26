'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Panel, PanelHeader, Select } from '@/ui';
import { US_TIMEZONES } from '@/domain/facilities';
import { useHydrated } from '@/client/use-hydrated';
import { createCompany } from '@/server/actions/companies';
import { lookUpCarrier } from '@/server/actions/fmcsa';

/**
 * Step two of signup: the carrier (docs/spec/flows.md, 1. Signup and setup).
 *
 * Typing a USDOT number and moving on looks the carrier up in FMCSA's public
 * data and fills the name in. No button: the lookup happens when the field is
 * left, which is what "typing a DOT number fills this in" should feel like.
 *
 * What it will not do:
 *  - overwrite a name already typed. It shows what FMCSA has instead, so a
 *    disagreement is visible rather than silently resolved;
 *  - fill an MC number, because the census file holds none;
 *  - fill an address, because a company has nowhere to keep one. The address
 *    is shown as proof this is the right carrier.
 *
 * Every failure falls back to the manual form, as the flow requires.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const ready = useHydrated();

  const [name, setName] = useState('');
  const [mcNumber, setMcNumber] = useState('');
  const [dotNumber, setDotNumber] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  const [lookedUp, setLookedUp] = useState('');
  const [dotHint, setDotHint] = useState<string | null>(null);
  const [dotError, setDotError] = useState<string | null>(null);

  async function lookUp() {
    const typed = dotNumber.trim();
    if (typed === '' || typed === lookedUp) return;

    setLookedUp(typed);
    setDotError(null);
    setDotHint('Looking this up with FMCSA…');

    const result = await lookUpCarrier({ dotNumber: typed });

    if (!result.ok) {
      setDotHint(null);
      setDotError(result.error);
      return;
    }

    const carrier = result.data.carrier;
    const where = carrier.address === '' ? '' : ` · ${carrier.address}`;

    if (name.trim() === '') {
      setName(carrier.legalName);
      setDotHint(`Filled in from FMCSA${where}`);
    } else {
      setDotHint(`FMCSA has this as ${carrier.legalName}${where}`);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const result = await createCompany({ name, mcNumber, dotNumber, timezone });

    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    router.replace('/today');
    router.refresh();
  }

  return (
    <form method="post" onSubmit={save}>
      <Panel>
        <PanelHeader title="Set up your carrier" />
        <FormGrid>
          <Field label="Carrier name" error={fieldErrors.name?.[0] ?? error ?? undefined}>
            <Input required value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Time zone" hint="Used for appointment times and pay weeks.">
            <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {US_TIMEZONES.map((entry) => (
                <option key={entry.zone} value={entry.zone}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="DOT number"
            hint={dotHint ?? 'Optional. Enter it and we will fill in the rest.'}
            error={dotError ?? undefined}
          >
            <Input
              value={dotNumber}
              onChange={(event) => setDotNumber(event.target.value)}
              onBlur={() => void lookUp()}
              inputMode="numeric"
              placeholder="1000001"
            />
          </Field>
          <Field label="MC number" hint="Optional. FMCSA's carrier file does not carry it.">
            <Input value={mcNumber} onChange={(event) => setMcNumber(event.target.value)} />
          </Field>
        </FormGrid>
        <FormActions>
          <Button type="submit" variant="primary" disabled={busy || !ready}>
            {busy ? 'Saving' : 'Finish setup'}
          </Button>
        </FormActions>
      </Panel>
    </form>
  );
}
