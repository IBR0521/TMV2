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
} from '@/ui';
import { formatPhone } from '@/domain/fleet';
import { useHydrated } from '@/client/use-hydrated';
import { removeContact, saveContact } from '@/server/actions/customers';

/**
 * The people at a customer worth phoning.
 *
 * A contact is removed, not archived: it is a person's phone number, not a
 * record of business, and one typed wrong should not stay on the screen for
 * ever.
 */
export type ContactView = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export function Contacts({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: ContactView[];
}) {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function add() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveContact({ customerId, name, email, phone });

      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setName('');
      setEmail('');
      setPhone('');
      router.refresh();
    });
  }

  function remove(contactId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeContact({ contactId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function reach(contact: ContactView): string {
    const parts = [contact.phone === null ? null : formatPhone(contact.phone), contact.email];
    const said = parts.filter((part): part is string => part !== null && part !== '');
    return said.length === 0 ? 'No phone or email' : said.join(' · ');
  }

  const first = (key: string): string | undefined => fieldErrors[key]?.[0];
  const general = Object.keys(fieldErrors).length === 0 ? error ?? undefined : undefined;

  return (
    <>
      {contacts.length === 0 ? (
        <EmptyState title="No contacts yet" hint="The person dispatch calls when a load is late." />
      ) : (
        contacts.map((contact) => (
          <ListRow
            key={contact.id}
            label={contact.name}
            title={reach(contact)}
            action={
              <Button size="sm" disabled={pending || !ready} onClick={() => remove(contact.id)}>
                Remove
              </Button>
            }
          />
        ))
      )}

      <FormGrid columns={1}>
        <Field label="Name" error={first('name') ?? general}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Pat Moreno"
            aria-label="Contact name"
          />
        </Field>

        <Field label="Email" error={first('email')}>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="pat@northline.com"
            aria-label="Contact email"
          />
        </Field>

        <Field label="Phone" error={first('phone')}>
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="(312) 555-0108"
            aria-label="Contact phone"
          />
        </Field>
      </FormGrid>

      <FormActions>
        <Button disabled={pending || !ready} onClick={add}>
          {pending ? 'Saving' : 'Add contact'}
        </Button>
      </FormActions>
    </>
  );
}
