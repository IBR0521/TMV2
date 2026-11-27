'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  Notice,
  Select,
  StopItem,
  Textarea,
} from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { markStopTime, removeStop, saveStop } from '@/server/actions/loads';

/**
 * The stops on a load, and the times the truck actually made.
 *
 * Arrive and depart are entered by the office here; the driver app sends them
 * itself from phase 4. They are what detention is worked out from, so each one
 * is a real time somebody can correct rather than a button that stamps "now"
 * and hopes — a dispatcher entering yesterday's arrival at nine this morning
 * would otherwise write nine o'clock into the record.
 */
export type StopView = {
  id: string;
  seq: number;
  type: 'pickup' | 'delivery';
  facilityId: string | null;
  facilityName: string | null;
  apptStart: string | null;
  timezone: string;
  arrivedAt: string | null;
  departedAt: string | null;
  /** The times as a clock at this dock reads them, for the form fields. */
  arrivedWall: string;
  departedWall: string;
  nowWall: string;
  reference: string | null;
  notes: string | null;
  state: 'done' | 'current' | 'upcoming';
  label: string;
  detail: string;
};

export function Stops({
  loadId,
  stops,
  facilities,
  canEdit,
}: {
  loadId: string;
  stops: StopView[];
  facilities: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<'pickup' | 'delivery'>(
    stops.some((stop) => stop.type === 'pickup') ? 'delivery' : 'pickup',
  );
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? '');
  const [apptStart, setApptStart] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const [times, setTimes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await saveStop({
        loadId,
        seq: stops.length + 1,
        type,
        facilityId,
        apptStart,
        apptEnd: '',
        reference,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setAdding(false);
      setApptStart('');
      setReference('');
      setNotes('');
      router.refresh();
    });
  }

  function drop(stopId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeStop({ stopId, loadId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function mark(stop: StopView, field: 'arrived_at' | 'departed_at') {
    setError(null);
    const existing = field === 'arrived_at' ? stop.arrivedWall : stop.departedWall;
    const typed = times[`${stop.id}-${field}`] ?? (existing === '' ? stop.nowWall : existing);

    startTransition(async () => {
      const result = await markStopTime({ stopId: stop.id, loadId, field, at: typed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function timeField(stop: StopView, field: 'arrived_at' | 'departed_at', label: string) {
    const key = `${stop.id}-${field}`;
    const existing = field === 'arrived_at' ? stop.arrivedWall : stop.departedWall;

    return (
      <Field label={label} hint={`Time at ${stop.facilityName ?? 'the dock'}`}>
        <Input
          type="datetime-local"
          value={times[key] ?? (existing === '' ? stop.nowWall : existing)}
          aria-label={`${label} for stop ${stop.seq}`}
          onChange={(event) => setTimes((all) => ({ ...all, [key]: event.target.value }))}
        />
      </Field>
    );
  }

  return (
    <>
      {stops.length === 0 ? (
        <EmptyState
          title="No stops yet"
          hint="A load needs a pickup and a delivery before it can be booked."
        />
      ) : (
        stops.map((stop) => (
          <StopItem
            key={stop.id}
            number={stop.seq}
            state={stop.state}
            label={stop.label}
            title={stop.facilityName ?? 'Facility not chosen'}
            detail={stop.detail}
            aside={
              canEdit ? (
                <Button size="sm" disabled={pending || !ready} onClick={() => drop(stop.id)}>
                  Remove
                </Button>
              ) : undefined
            }
          />
        ))
      )}

      {error === null ? null : (
        <Notice tone="warning" label="Not saved">
          {error}
        </Notice>
      )}

      {!canEdit ? null : (
        <>
          {stops
            .filter((stop) => stop.departedAt === null)
            .slice(0, 1)
            .map((stop) => (
              <FormGrid key={stop.id} columns={3}>
                {timeField(stop, 'arrived_at', `Arrived at stop ${stop.seq}`)}
                {timeField(stop, 'departed_at', `Left stop ${stop.seq}`)}
                <Field label="Record it">
                  <FormActions>
                    <Button
                      size="sm"
                      disabled={pending || !ready}
                      onClick={() => mark(stop, 'arrived_at')}
                    >
                      Arrived
                    </Button>
                    <Button
                      size="sm"
                      disabled={pending || !ready || stop.arrivedAt === null}
                      onClick={() => mark(stop, 'departed_at')}
                    >
                      Left
                    </Button>
                  </FormActions>
                </Field>
              </FormGrid>
            ))}

          {adding ? (
            <>
              <FormGrid>
                <Field label="Pickup or delivery">
                  <Select
                    value={type}
                    aria-label="Pickup or delivery"
                    onChange={(event) => setType(event.target.value as 'pickup' | 'delivery')}
                  >
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </Select>
                </Field>

                <Field label="Where" hint="Facilities are kept once and reused.">
                  <Select
                    value={facilityId}
                    aria-label="Facility"
                    onChange={(event) => setFacilityId(event.target.value)}
                  >
                    <option value="">Not chosen yet</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Appointment" hint="The time at the dock.">
                  <Input
                    type="datetime-local"
                    value={apptStart}
                    aria-label="Appointment"
                    onChange={(event) => setApptStart(event.target.value)}
                  />
                </Field>

                <Field label="Their reference">
                  <Input
                    value={reference}
                    aria-label="Reference at this stop"
                    placeholder="PO 44182"
                    onChange={(event) => setReference(event.target.value)}
                  />
                </Field>
              </FormGrid>

              <FormGrid columns={1}>
                <Field label="Notes" hint="What the driver needs to know at the gate.">
                  <Textarea
                    value={notes}
                    aria-label="Stop notes"
                    placeholder="Check in at the guard shack."
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </Field>
              </FormGrid>

              <FormActions>
                <Button disabled={pending} onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button disabled={pending || !ready} onClick={add}>
                  {pending ? 'Saving' : `Add ${type}`}
                </Button>
              </FormActions>
            </>
          ) : (
            <FormActions>
              <Button
                disabled={!ready}
                onClick={() => {
                  // A load with a pickup on it almost always wants a delivery
                  // next; the state is set on opening rather than at mount, so
                  // the second stop does not default to another pickup.
                  setType(stops.some((stop) => stop.type === 'pickup') ? 'delivery' : 'pickup');
                  setAdding(true);
                }}
              >
                Add a stop
              </Button>
            </FormActions>
          )}
        </>
      )}
    </>
  );
}
