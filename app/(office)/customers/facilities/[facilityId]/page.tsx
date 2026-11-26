import { notFound } from 'next/navigation';
import {
  Breadcrumb,
  Cell,
  CellGroup,
  CellLabel,
  Columns,
  MainColumn,
  PageHeader,
  Panel,
  PanelHeader,
  SideColumn,
  StatusChip,
} from '@/ui';
import { detentionLabel, geocodeLook, timezoneLabel } from '@/domain/facilities';
import { requireSection } from '@/server/guard';
import { getCompany } from '@/server/services/companies';
import { getFacility } from '@/server/services/facilities';
import { FacilityForm } from '../facility-form';
import { ArchiveFacility } from './archive';

export const metadata = { title: 'Facility' };

/**
 * One facility: what it is called, where it is, how long a truck may sit
 * there for nothing, and what a driver needs to know at the gate.
 *
 * Where it sits on a map is shown as a chip and its coordinates, not a map.
 * The draggable pin is a later step of this phase and waits on the owner's
 * decision about the basemap; a map that cannot be corrected would be worse
 * than none.
 */
export default async function FacilityPage({
  params,
}: {
  params: Promise<{ facilityId: string }>;
}) {
  const ctx = await requireSection('customers');
  const { facilityId } = await params;

  const [facility, company] = await Promise.all([getFacility(ctx, facilityId), getCompany(ctx)]);
  if (facility === null) notFound();

  const look = geocodeLook(facility.geocodeStatus, facility.lat !== null);
  const coords =
    facility.lat === null || facility.lng === null
      ? 'Not placed yet'
      : `${facility.lat.toFixed(4)}, ${facility.lng.toFixed(4)}`;

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Facilities', href: '/customers/facilities' },
          { label: facility.name },
        ]}
      />

      <PageHeader
        title={facility.name}
        subtitle={facility.address}
        status={
          <StatusChip tone={look.tone} dot={look.tone === 'warning'}>
            {look.label}
          </StatusChip>
        }
      >
        <ArchiveFacility facilityId={facility.id} name={facility.name} />
      </PageHeader>

      <Columns>
        <MainColumn>
          <Panel label="Details">
            <PanelHeader title="Details" />
            <FacilityForm facility={facility} companyTimezone={company.timezone} />
          </Panel>
        </MainColumn>

        <SideColumn>
          <Panel label="Where it is">
            <PanelHeader title="Where it is" />
            <CellGroup>
              <Cell basis="sm">
                <CellLabel>Coordinates</CellLabel>
                {coords}
              </Cell>
              <Cell basis="sm">
                <CellLabel>Time zone</CellLabel>
                {timezoneLabel(facility.timezone)}
              </Cell>
            </CellGroup>
            <CellGroup>
              <Cell basis="sm">
                <CellLabel>Free time</CellLabel>
                {detentionLabel(facility.detentionFreeMinutes)}
              </Cell>
              <Cell basis="sm">
                <CellLabel>Gate notes</CellLabel>
                {facility.notes ?? 'None'}
              </Cell>
            </CellGroup>
          </Panel>
        </SideColumn>
      </Columns>
    </>
  );
}
