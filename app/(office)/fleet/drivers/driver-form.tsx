'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select } from '@/ui';
import {
  DRIVER_STATUSES,
  DRIVER_TYPES,
  driverStatusLabel,
  driverTypeLabel,
  formatPhone,
} from '@/domain/fleet';
import type { DriverStatus, DriverType } from '@/domain/fleet';
import { useHydrated } from '@/client/use-hydrated';
import { saveDriver } from '@/server/actions/fleet';

/**
 * One form for a new driver and for editing one (CLAUDE.md rule 7). The only
 * difference is whether an id goes with it, and where it goes afterwards.
 */
export type DriverDraft = {
  id: string;
  name: string;
  phone: string | null;
  type: DriverType;
  status: DriverStatus;
  homeLocation: string | null;
};

export function DriverForm({ driver }: { driver?: DriverDraft }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(driver?.name ?? '');
  const [phone, setPhone] = useState(driver?.phone === null ? '' : formatPhone(driver?.phone ?? ''));
  const [type, setType] = useState<DriverType>(driver?.type ?? 'company');
  const [status, setStatus] = useState<DriverStatus>(driver?.status ?? 'active');
  const [homeLocation, setHomeLocation] = useState(driver?.homeLocation ?? '');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveDriver({ id: driver?.id, name, phone, type, status, homeLocation });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (driver === undefined) {
        router.push(`/fleet/drivers/${result.data.driverId}`);
      } else {
        router.refresh();
      }
    });
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  // The kit has no form-level error line, so a problem about the whole form
  // (rather than one field) is shown on the first field, as the team form does.
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <>
      <FormGrid>
        <Field label="Name" error={first('name') ?? general}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Luis Ortega"
            aria-label="Driver name"
          />
        </Field>

        <Field label="Phone" hint="The number dispatch actually calls." error={first('phone')}>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(214) 555-0142"
            aria-label="Phone"
          />
        </Field>

        <Field label="Type" error={first('type')}>
          <Select
            value={type}
            aria-label="Driver type"
            onChange={(event) => setType(event.target.value as DriverType)}
          >
            {DRIVER_TYPES.map((value) => (
              <option key={value} value={value}>
                {driverTypeLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" error={first('status')}>
          <Select
            value={status}
            aria-label="Status"
            onChange={(event) => setStatus(event.target.value as DriverStatus)}
          >
            {DRIVER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {driverStatusLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Home"
          hint="Where they go home. Dispatch weighs it from phase 3."
          error={first('homeLocation')}
        >
          <Input
            value={homeLocation}
            onChange={(event) => setHomeLocation(event.target.value)}
            placeholder="Laredo, TX"
            aria-label="Home location"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button href="/fleet">Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : driver === undefined ? 'Add driver' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
