'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select } from '@/ui';
import { US_TIMEZONES } from '@/domain/facilities';
import { useHydrated } from '@/client/use-hydrated';
import { updateCompany } from '@/server/actions/companies-settings';

/**
 * The carrier's own details, including the two figures every profit estimate
 * leans on. They are called estimates everywhere they are shown, and this is
 * the one screen that says what they are made of.
 */
export type CompanyDraft = {
  name: string;
  mcNumber: string | null;
  dotNumber: string | null;
  timezone: string;
  driverPayCentsPerMile: number;
  fuelCentsPerMile: number;
};

export function CompanyForm({ company }: { company: CompanyDraft }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(company.name);
  const [mcNumber, setMcNumber] = useState(company.mcNumber ?? '');
  const [dotNumber, setDotNumber] = useState(company.dotNumber ?? '');
  const [timezone, setTimezone] = useState(company.timezone);
  const [driverPay, setDriverPay] = useState(String(company.driverPayCentsPerMile));
  const [fuel, setFuel] = useState(String(company.fuelCentsPerMile));

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  function save() {
    setError(null);
    setFieldErrors({});
    setSaved(false);

    startTransition(async () => {
      const result = await updateCompany({
        name,
        mcNumber,
        dotNumber,
        timezone,
        driverPayCentsPerMile: driverPay,
        fuelCentsPerMile: fuel,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <>
      <FormGrid>
        <Field label="Carrier name" error={first('name') ?? general}>
          <Input value={name} aria-label="Carrier name" onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Time zone" hint="Appointment times and pay weeks follow it." error={first('timezone')}>
          <Select value={timezone} aria-label="Time zone" onChange={(e) => setTimezone(e.target.value)}>
            {US_TIMEZONES.map((entry) => (
              <option key={entry.zone} value={entry.zone}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="MC number" error={first('mcNumber')}>
          <Input value={mcNumber} aria-label="MC number" onChange={(e) => setMcNumber(e.target.value)} />
        </Field>

        <Field label="USDOT number" error={first('dotNumber')}>
          <Input value={dotNumber} aria-label="USDOT number" onChange={(e) => setDotNumber(e.target.value)} />
        </Field>

        <Field
          label="Driver pay, cents a mile"
          hint="A placeholder for the profit estimate until pay profiles arrive in phase 6."
          error={first('driverPayCentsPerMile')}
        >
          <Input value={driverPay} aria-label="Driver pay in cents a mile" onChange={(e) => setDriverPay(e.target.value)} />
        </Field>

        <Field
          label="Fuel, cents a mile"
          hint="A placeholder until real routing and fuel purchases arrive in phase 7."
          error={first('fuelCentsPerMile')}
        >
          <Input value={fuel} aria-label="Fuel in cents a mile" onChange={(e) => setFuel(e.target.value)} />
        </Field>
      </FormGrid>

      <FormActions>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : saved ? 'Saved' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
