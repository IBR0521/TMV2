import { notFound } from 'next/navigation';
import { Breadcrumb, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireRole } from '@/server/guard';
import { listCustomers } from '@/server/services/customers';
import { getLoad } from '@/server/services/loads';
import { LoadForm } from '../../load-form';

export const metadata = { title: 'Edit load' };

/** The same form New load uses, with the load in it (CLAUDE.md rule 7). */
export default async function EditLoadPage({
  params,
}: {
  params: Promise<{ loadId: string }>;
}) {
  const ctx = await requireRole('loads', ['owner', 'dispatcher']);
  const { loadId } = await params;

  const [detail, customers] = await Promise.all([getLoad(ctx, loadId), listCustomers(ctx)]);
  if (detail === null) notFound();

  const { load } = detail;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Loads', href: '/loads' },
          { label: `#${load.loadNumber}`, href: `/loads/${load.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageHeader
        title={`Edit #${load.loadNumber}`}
        subtitle="Stops, charges and status are changed on the load itself."
      />

      <Panel label="Load">
        <PanelHeader title="Details" />
        <LoadForm
          load={{
            id: load.id,
            customerId: load.customerId,
            brokerRef: load.brokerRef,
            totalMiles: load.totalMiles,
            emptyMiles: load.emptyMiles,
            notes: load.notes,
          }}
          customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
        />
      </Panel>
    </>
  );
}
