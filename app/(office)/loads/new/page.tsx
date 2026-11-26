import { Breadcrumb, Notice, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireRole } from '@/server/guard';
import { listCustomers } from '@/server/services/customers';
import { LoadForm } from '../load-form';

export const metadata = { title: 'New load' };

/**
 * New load (docs/spec/screens.md, row 3): "Drop a rate con for an AI draft, or
 * type it in."
 *
 * Phase 3a is the typing-it-in half. Dropping a rate con is phase 3b, and the
 * notice says so rather than leaving a dispatcher hunting for a drop zone
 * that is not there yet.
 */
export default async function NewLoadPage() {
  const ctx = await requireRole('loads', ['owner', 'dispatcher']);
  const customers = await listCustomers(ctx);

  return (
    <>
      <Breadcrumb items={[{ label: 'Loads', href: '/loads' }, { label: 'New load' }]} />

      <PageHeader
        title="New load"
        subtitle="Stops and charges are added on the load itself, once it exists."
      />

      <Notice label="Coming in 3b">
        Dropping a rate con on this page to have it read for you is the next piece of work.
      </Notice>

      <Panel label="Load">
        <PanelHeader title="Details" />
        <LoadForm customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))} />
      </Panel>
    </>
  );
}
