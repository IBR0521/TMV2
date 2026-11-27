import { PageHeader, Panel, PanelHeader } from '@/ui';
import { requireRole } from '@/server/guard';
import { getCompany } from '@/server/services/companies';
import { CompanyForm } from './company-form';

export const metadata = { title: 'Company' };

/**
 * The carrier's own details (docs/spec/screens.md, Settings).
 *
 * Owner only. The time zone decides when a pay week ends, and the two
 * placeholder rates decide what every load looks like it makes — neither is
 * something a dispatcher should move by accident.
 */
export default async function CompanyPage() {
  const ctx = await requireRole('settings', ['owner']);
  const company = await getCompany(ctx);

  return (
    <>
      <PageHeader title="Company" subtitle="Name, numbers, time zone, and what a mile costs you." />

      <Panel label="Carrier details">
        <PanelHeader title="Carrier details" />
        <CompanyForm
          company={{
            name: company.name,
            mcNumber: company.mcNumber,
            dotNumber: company.dotNumber,
            timezone: company.timezone,
            driverPayCentsPerMile: company.driverPayCentsPerMile,
            fuelCentsPerMile: company.fuelCentsPerMile,
          }}
        />
      </Panel>
    </>
  );
}
