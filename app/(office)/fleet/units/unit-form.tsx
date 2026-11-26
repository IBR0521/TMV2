'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormActions, FormGrid, Input, Select } from '@/ui';
import {
  TRAILER_TYPES,
  UNIT_STATUSES,
  trailerTypeLabel,
  unitStatusLabel,
} from '@/domain/fleet';
import type { TrailerType, UnitStatus } from '@/domain/fleet';
import { useHydrated } from '@/client/use-hydrated';
import { saveTrailer, saveTruck } from '@/server/actions/fleet';

/**
 * One form per kind of unit, each serving both new and edit (CLAUDE.md rule
 * 7). The truck form is where the plan's truck limit is felt: the action
 * refuses an active truck beyond it and says what to do, and the message lands
 * on the first field, as the kit gives no form-level error line.
 */
export type TruckDraft = {
  id: string;
  unitNumber: string;
  vin: string | null;
  plate: string | null;
  status: UnitStatus;
  odometerMiles: number | null;
  ownerDriverId: string | null;
};

export type TrailerDraft = {
  id: string;
  unitNumber: string;
  type: TrailerType;
  status: UnitStatus;
};

type DriverOption = { id: string; name: string };

function statusOptions() {
  return UNIT_STATUSES.map((value) => (
    <option key={value} value={value}>
      {unitStatusLabel(value)}
    </option>
  ));
}

export function TruckForm({
  truck,
  drivers,
}: {
  truck?: TruckDraft;
  drivers: DriverOption[];
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [unitNumber, setUnitNumber] = useState(truck?.unitNumber ?? '');
  const [vin, setVin] = useState(truck?.vin ?? '');
  const [plate, setPlate] = useState(truck?.plate ?? '');
  const [status, setStatus] = useState<UnitStatus>(truck?.status ?? 'active');
  const [odometerMiles, setOdometerMiles] = useState(
    truck?.odometerMiles === null || truck?.odometerMiles === undefined
      ? ''
      : String(truck.odometerMiles),
  );
  const [ownerDriverId, setOwnerDriverId] = useState(truck?.ownerDriverId ?? '');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveTruck({
        id: truck?.id,
        unitNumber,
        vin,
        plate,
        status,
        odometerMiles,
        ownerDriverId,
      });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (truck === undefined) {
        router.push(`/fleet/units/${result.data.truckId}`);
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
        <Field label="Unit number" error={first('unitNumber') ?? general}>
          <Input
            value={unitNumber}
            onChange={(event) => setUnitNumber(event.target.value)}
            placeholder="117"
            aria-label="Unit number"
          />
        </Field>

        <Field label="Status" error={first('status')}>
          <Select
            value={status}
            aria-label="Status"
            onChange={(event) => setStatus(event.target.value as UnitStatus)}
          >
            {statusOptions()}
          </Select>
        </Field>

        <Field label="VIN" hint="17 characters, no I, O or Q." error={first('vin')}>
          <Input
            value={vin}
            onChange={(event) => setVin(event.target.value)}
            placeholder="1FUJGBDV8CLBA1234"
            aria-label="VIN"
          />
        </Field>

        <Field label="Plate" error={first('plate')}>
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            placeholder="TX 4R18329"
            aria-label="Plate"
          />
        </Field>

        <Field label="Odometer" hint="Whole miles." error={first('odometerMiles')}>
          <Input
            value={odometerMiles}
            onChange={(event) => setOdometerMiles(event.target.value)}
            placeholder="412980"
            aria-label="Odometer"
          />
        </Field>

        <Field
          label="Owner-operator"
          hint="Only when the driver owns this truck."
          error={first('ownerDriverId')}
        >
          <Select
            value={ownerDriverId}
            aria-label="Owner-operator"
            onChange={(event) => setOwnerDriverId(event.target.value)}
          >
            <option value="">Company truck</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>

      <FormActions>
        <Button href="/fleet/units">Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : truck === undefined ? 'Add truck' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}

export function TrailerForm({ trailer }: { trailer?: TrailerDraft }) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [unitNumber, setUnitNumber] = useState(trailer?.unitNumber ?? '');
  const [type, setType] = useState<TrailerType>(trailer?.type ?? 'dry_van');
  const [status, setStatus] = useState<UnitStatus>(trailer?.status ?? 'active');

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function save() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveTrailer({ id: trailer?.id, unitNumber, type, status });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      if (trailer === undefined) {
        router.push(`/fleet/units/${result.data.trailerId}`);
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
        <Field label="Trailer number" error={first('unitNumber') ?? general}>
          <Input
            value={unitNumber}
            onChange={(event) => setUnitNumber(event.target.value)}
            placeholder="T450"
            aria-label="Trailer number"
          />
        </Field>

        <Field label="Type" error={first('type')}>
          <Select
            value={type}
            aria-label="Trailer type"
            onChange={(event) => setType(event.target.value as TrailerType)}
          >
            {TRAILER_TYPES.map((value) => (
              <option key={value} value={value}>
                {trailerTypeLabel(value)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" error={first('status')}>
          <Select
            value={status}
            aria-label="Status"
            onChange={(event) => setStatus(event.target.value as UnitStatus)}
          >
            {statusOptions()}
          </Select>
        </Field>
      </FormGrid>

      <FormActions>
        <Button href="/fleet/units">Cancel</Button>
        <Button variant="primary" disabled={pending || !ready} onClick={save}>
          {pending ? 'Saving' : trailer === undefined ? 'Add trailer' : 'Save'}
        </Button>
      </FormActions>
    </>
  );
}
