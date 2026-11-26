import { Breadcrumb, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireSection } from '@/server/guard';
import { CustomerForm } from '../customer-form';

export const metadata = { title: 'New customer' };

/** The same form the customer page uses, with nothing in it yet. */
export default async function NewCustomerPage() {
  await requireSection('customers');

  return (
    <>
      <Breadcrumb items={[{ label: 'Customers', href: '/customers' }, { label: 'New customer' }]} />

      <PageHeader
        title="New customer"
        subtitle="Contacts are added once the customer exists."
      />

      <Panel label="Customer">
        <PanelHeader title="Details" />
        <CustomerForm />
      </Panel>
    </>
  );
}
