'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Panel, PanelHeader, Select } from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { createCompany } from '@/server/actions/companies';

/**
 * Step two of signup: the carrier. Typing a DOT number fills this in from the
 * FMCSA census file in phase 2; phase 1 is the manual form the spec asks for.
 */
const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

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
              {TIME_ZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="MC number" hint="Optional">
            <Input value={mcNumber} onChange={(event) => setMcNumber(event.target.value)} />
          </Field>
          <Field label="DOT number" hint="Optional">
            <Input value={dotNumber} onChange={(event) => setDotNumber(event.target.value)} />
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
