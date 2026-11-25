'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthCard, FormError } from '@/ui/auth-card';
import { Button } from '@/ui/button';
import { useHydrated } from '@/ui/use-hydrated';
import { Field, Select, TextInput } from '@/ui/field';
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
    <AuthCard title="Set up your carrier" subline="You can change any of this later in Settings.">
      <form method="post" onSubmit={save} className="space-y-4">
        <FormError message={error} />
        <Field label="Carrier name" error={fieldErrors.name?.[0]}>
          <TextInput name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MC number" hint="Optional">
            <TextInput name="mcNumber" value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} />
          </Field>
          <Field label="DOT number" hint="Optional">
            <TextInput name="dotNumber" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} />
          </Field>
        </div>
        <Field label="Time zone" hint="Used for appointment times and pay weeks.">
          <Select name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.split('/')[1]?.replace(/_/g, ' ')} · {zone}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="primary" disabled={busy || !ready} className="w-full">
          {busy ? 'Saving…' : 'Finish setup'}
        </Button>
      </form>
    </AuthCard>
  );
}
