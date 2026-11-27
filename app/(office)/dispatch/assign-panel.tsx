'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Notice,
  Select,
  UnassignedLoad,
} from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { assignLoad, moveLoad } from '@/server/actions/loads';

/**
 * The loads waiting for a driver, down the side of the board.
 *
 * Assigning and dispatching are two steps on purpose: putting a driver on a
 * load is a plan, and dispatching is telling them to go. The board does both
 * in one press because that is what a dispatcher means by "assign", but the
 * state machine still sees them separately and can refuse the second.
 *
 * Phase 3 step 6 ranks the drivers and suggests one. Until then the list is
 * plain, and the dispatcher chooses.
 */
export type Waiting = {
  id: string;
  loadNumber: string;
  rateCents: number;
  route: string;
  meta: string;
};

export function AssignPanel({
  waiting,
  drivers,
  trucks,
}: {
  waiting: Waiting[];
  drivers: { id: string; name: string }[];
  trucks: { id: string; unit: string }[];
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [chosen, setChosen] = useState<string | null>(null);
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? '');
  const [truckId, setTruckId] = useState(trucks[0]?.id ?? '');
  const [problem, setProblem] = useState<string | null>(null);

  function confirm() {
    if (chosen === null) return;
    setProblem(null);

    startTransition(async () => {
      const assigned = await assignLoad({ loadId: chosen, driverId, truckId, trailerId: '' });
      if (!assigned.ok) {
        setProblem(assigned.error);
        return;
      }

      // Dispatching is a separate move, so the state machine can still refuse
      // it — a draft with no delivery, say — without the assignment being lost.
      const dispatched = await moveLoad({ loadId: chosen, to: 'dispatched' });
      if (!dispatched.ok) {
        setProblem(`${dispatched.error} The driver is on the load either way.`);
        router.refresh();
        return;
      }

      setChosen(null);
      router.refresh();
    });
  }

  if (waiting.length === 0) {
    return <EmptyState title="Every load has a driver" hint="Nothing is waiting on dispatch." />;
  }

  return (
    <>
      {waiting.map((load, index) => (
        <UnassignedLoad
          key={load.id}
          number={`#${load.loadNumber}`}
          rateCents={load.rateCents}
          route={load.route}
          meta={load.meta}
          primary={index === 0 && chosen === null}
          onAssign={() => {
            setProblem(null);
            setChosen(load.id);
          }}
        />
      ))}

      {chosen === null ? null : (
        <>
          <FormGrid columns={1}>
            <Field label="Driver">
              <Select
                value={driverId}
                aria-label="Driver"
                onChange={(event) => setDriverId(event.target.value)}
              >
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Truck">
              <Select
                value={truckId}
                aria-label="Truck"
                onChange={(event) => setTruckId(event.target.value)}
              >
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    Unit {truck.unit}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>

          {problem === null ? null : (
            <Notice tone="warning" label="Not yet">
              {problem}
            </Notice>
          )}

          <FormActions>
            <Button disabled={pending} onClick={() => setChosen(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={pending || !ready || driverId === '' || truckId === ''}
              onClick={confirm}
            >
              {pending ? 'Dispatching' : 'Assign and dispatch'}
            </Button>
          </FormActions>
        </>
      )}
    </>
  );
}
