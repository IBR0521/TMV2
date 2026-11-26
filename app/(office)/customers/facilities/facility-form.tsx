'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select, Textarea } from '@/ui';
import { US_TIMEZONES } from '@/domain/facilities';
import { useHydrated } from '@/client/use-hydrated';
import { saveFacility } from '@/server/actions/facilities';

/**
 * One form for a new facility and for editing one (CLAUDE.md rule 7).
 *
 * The time zone is chosen, not guessed: an appointment window is stored
 * against the facility's own zone from phase 3, so 08:00 means 08:00 at that
 * dock. The geocoder returns coordinates and no zone.
 */
export type FacilityDraft = {
  id: string;
  name: string;
  address: string;
  timezone: string;
  detentionFreeMinutes: number;
  notes: string | null;
};

export function FacilityForm({
  facility,
  companyTimezone,
}: {
  facility?: FacilityDraft;
  companyTimezone: string;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(facility?.name ?? '');
  const [address, setAddress] = useState(facility?.address ?? '');
  const [timezone, setTimezone] = useState(facility?.timezone ?? companyTimezone);
  const [detentionFreeMinutes, setDetentionFreeMinutes] = useState(
    String(facility?.detentionFreeMinutes ?? 120),
  );
  const [notes, setNotes] = useState(facility?.notes ?? '');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveFacility({
        id: facility?.id,
        name,
        address,
        timezone,
        detentionFreeMinutes,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (facility === undefined) {
        router.push(`/customers/facilities/${result.data.facilityId}`);
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
            placeholder="Northline Dallas DC"
            aria-label="Facility name"
          />
        </Field>

        <Field
          label="Address"
          hint="Changing it sends the address to be looked up again."
          error={first('address')}
        >
          <Input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="4700 Sunbelt Drive, Dallas, TX 75236"
            aria-label="Address"
          />
        </Field>

        <Field
          label="Time zone"
          hint="Appointment times are read in this zone."
          error={first('timezone')}
        >
          <Select
            value={timezone}
            aria-label="Time zone"
            onChange={(event) => setTimezone(event.target.value)}
          >
            {US_TIMEZONES.map((entry) => (
              <option key={entry.zone} value={entry.zone}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Free time"
          hint="Minutes before detention starts."
          error={first('detentionFreeMinutes')}
        >
          <Input
            value={detentionFreeMinutes}
            onChange={(event) => setDetentionFreeMinutes(event.target.value)}
            placeholder="120"
            aria-label="Free minutes before detention"
          />
        </Field>
      </FormGrid>

      <FormGrid columns={1}>
        <Field label="Notes" hint="What a driver needs to know at the gate." error={first('notes')}>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Check in at the guard shack. Lumper paid by the broker."
            aria-label="Notes"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button href="/customers/facilities">Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : facility === undefined ? 'Add facility' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
