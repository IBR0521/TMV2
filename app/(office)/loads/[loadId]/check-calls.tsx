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
  ListRow,
  Notice,
  Panel,
  PanelHeader,
} from '@/ui';
import { useHydrated } from '@/client/use-hydrated';
import { addCheckCall, removeCheckCall } from '@/server/actions/loads';

/**
 * Where the truck was when somebody asked.
 *
 * Office-entered for now; the driver app reports its own position from phase
 * 4. The location is free text on purpose — "on I-20 near Birmingham" is what
 * a driver says on the phone, and a form that demanded coordinates would get
 * nothing written down at all.
 */
export type CheckCallView = {
  id: string;
  at: string;
  shown: string;
  location: string;
  note: string | null;
};

export function CheckCalls({
  loadId,
  calls,
  nowLocal,
  canAdd,
}: {
  loadId: string;
  calls: CheckCallView[];
  /** Now, as a datetime-local value, so the field starts somewhere sensible. */
  nowLocal: string;
  canAdd: boolean;
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [at, setAt] = useState(nowLocal);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function add() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await addCheckCall({ loadId, at, location, note });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setLocation('');
      setNote('');
      router.refresh();
    });
  }

  function remove(checkCallId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCheckCall({ checkCallId, loadId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <Panel label="Check calls">
      <PanelHeader title="Check calls" count={calls.length} />

      {calls.length === 0 ? (
        <EmptyState
          title="No check calls yet"
          hint="Where the truck was when you last spoke to the driver."
        />
      ) : (
        calls.map((call) => (
          <ListRow
            key={call.id}
            label={call.shown}
            title={call.note === null ? call.location : `${call.location} · ${call.note}`}
            action={
              !canAdd ? undefined : (
                <Button size="sm" disabled={pending || !ready} onClick={() => remove(call.id)}>
                  Remove
                </Button>
              )
            }
          />
        ))
      )}

      {general === undefined ? null : (
        <Notice tone="warning" label="Not saved">
          {general}
        </Notice>
      )}

      {!canAdd ? null : (
        <>
          <FormGrid columns={3}>
            <Field label="When" error={first('at')}>
              <Input
                type="datetime-local"
                value={at}
                aria-label="When the call was"
                onChange={(event) => setAt(event.target.value)}
              />
            </Field>

            <Field label="Where" error={first('location')}>
              <Input
                value={location}
                aria-label="Where the truck is"
                placeholder="On I-20 near Birmingham, AL"
                onChange={(event) => setLocation(event.target.value)}
              />
            </Field>

            <Field label="Note" error={first('note')}>
              <Input
                value={note}
                aria-label="Note"
                placeholder="Running an hour behind"
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </FormGrid>

          <FormActions>
            <Button
              disabled={pending || !ready || location.trim() === ''}
              onClick={add}
            >
              {pending ? 'Saving' : 'Record the call'}
            </Button>
          </FormActions>
        </>
      )}
    </Panel>
  );
}
