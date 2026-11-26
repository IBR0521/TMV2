import { Breadcrumb, PageHeader, Panel, PanelHeader } from '@/ui';
import { requireSection } from '@/server/guard';
import { getCompany } from '@/server/services/companies';
import { FacilityForm } from '../facility-form';

export const metadata = { title: 'New facility' };

/**
 * The same form the facility page uses, with nothing in it yet. The time zone
 * starts at the carrier's own, which is right more often than not.
 */
export default async function NewFacilityPage() {
  const ctx = await requireSection('customers');
  const company = await getCompany(ctx);

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Facilities', href: '/customers/facilities' },
          { label: 'New facility' },
        ]}
      />

      <PageHeader
        title="New facility"
        subtitle="Saved once, reused by every load that stops here."
      />

      <Panel label="Facility">
        <PanelHeader title="Details" />
        <FacilityForm companyTimezone={company.timezone} />
      </Panel>
    </>
  );
}
