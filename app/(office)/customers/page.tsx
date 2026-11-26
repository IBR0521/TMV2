import {
  Button,
  type Column,
  DataTable,
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  SearchField,
  StatusChip,
  Tabs,
  TextLink,
} from '@/ui';
import { customerTypeLabel, paymentTermsLabel } from '@/domain/customers';
import { requireSection } from '@/server/guard';
import { listCustomers, type CustomerRow } from '@/server/services/customers';
import { listFacilities } from '@/server/services/facilities';

export const metadata = { title: 'Customers' };

/**
 * Brokers and shippers with their terms (docs/spec/screens.md, row 20).
 *
 * The scorecard on that row — pay speed, detention history — is read from
 * invoices and loads, so it arrives with phases 3 and 5. Nothing here stands
 * in for it.
 */
const COLUMNS: Column<CustomerRow>[] = [
  {
    key: 'name',
    header: 'Customer',
    render: (customer) => (
      <TextLink href={`/customers/${customer.id}`}>{customer.name}</TextLink>
    ),
  },
  { key: 'type', header: 'Type', render: (customer) => customerTypeLabel(customer.type) },
  { key: 'mc', header: 'MC', render: (customer) => customer.mcNumber ?? '—' },
  {
    key: 'billing',
    header: 'Billing',
    render: (customer) => customer.billingEmail ?? '—',
  },
  {
    key: 'contacts',
    header: 'Contacts',
    render: (customer) =>
      customer.contactCount === 0 ? '—' : String(customer.contactCount),
  },
  {
    key: 'send',
    header: 'Invoice',
    render: (customer) =>
      customer.sendMode === 'email' ? (
        <StatusChip tone="idle">We email it</StatusChip>
      ) : (
        <StatusChip tone="normal">Their portal</StatusChip>
      ),
  },
  {
    key: 'terms',
    header: 'Terms',
    align: 'right',
    render: (customer) => paymentTermsLabel(customer.paymentTermsDays),
  },
];

export default async function CustomersPage() {
  const ctx = await requireSection('customers');
  const [customers, facilities] = await Promise.all([listCustomers(ctx), listFacilities(ctx)]);
  const empty = customers.length === 0;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}
      >
        <SearchField action="/search" />
        {empty ? null : (
          <Button variant="primary" href="/customers/new">
            New customer
          </Button>
        )}
      </PageHeader>

      <Tabs
        items={[
          { label: 'Customers', href: '/customers', active: true, count: customers.length },
          { label: 'Facilities', href: '/customers/facilities', count: facilities.length },
        ]}
      />

      <Panel label="Customers">
        <PanelHeader title="Customers" count={customers.length} />

        {empty ? (
          <EmptyState
            title="No customers yet"
            hint="Add a broker or shipper, or import a list from Settings."
            action={
              <Button variant="primary" href="/customers/new">
                New customer
              </Button>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} rows={customers} rowKey={(customer) => customer.id} />
        )}
      </Panel>
    </>
  );
}
