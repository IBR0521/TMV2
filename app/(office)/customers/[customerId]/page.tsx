import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  Columns,
  MainColumn,
  PageHeader,
  Panel,
  PanelHeader,
  SideColumn,
  StatusChip,
} from '@/ui';
import { customerTypeLabel, paymentTermsLabel } from '@/domain/customers';
import { requireSection } from '@/server/guard';
import { getCustomer, listContacts } from '@/server/services/customers';
import { CustomerForm } from '../customer-form';
import { ArchiveCustomer } from './archive';
import { Contacts, type ContactView } from './contacts';

export const metadata = { title: 'Customer' };

/**
 * The customer page (docs/spec/screens.md, row 21): contacts and terms.
 *
 * Loads, pay speed and detention history are on that row too and are read from
 * loads and invoices, so they arrive with phases 3 and 5. "New load", the
 * primary action the spec gives this screen, arrives with them — until loads
 * exist there is nothing for it to make.
 */
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const ctx = await requireSection('customers');
  const { customerId } = await params;

  const customer = await getCustomer(ctx, customerId);
  if (customer === null) notFound();

  const contacts = await listContacts(ctx, customerId);
  const rows: ContactView[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
  }));

  return (
    <>
      <Breadcrumb items={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]} />

      <PageHeader
        title={customer.name}
        subtitle={`${customerTypeLabel(customer.type)} · ${paymentTermsLabel(customer.paymentTermsDays)}`}
        status={
          customer.sendMode === 'email' ? (
            <StatusChip tone="idle">We email the invoice</StatusChip>
          ) : (
            <StatusChip tone="normal">Their own portal</StatusChip>
          )
        }
      >
        <ArchiveCustomer customerId={customer.id} name={customer.name} />
      </PageHeader>

      <Columns>
        <MainColumn>
          <Panel label="Details">
            <PanelHeader title="Details" />
            <CustomerForm customer={customer} />
          </Panel>
        </MainColumn>

        <SideColumn>
          <Panel label="Contacts">
            <PanelHeader title="Contacts" count={rows.length} />
            <Contacts customerId={customer.id} contacts={rows} />
          </Panel>
        </SideColumn>
      </Columns>
    </>
  );
}
