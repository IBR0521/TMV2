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
import { detentionLabel, geocodeLook, timezoneLabel } from '@/domain/facilities';
import { requireSection } from '@/server/guard';
import { listCustomers } from '@/server/services/customers';
import { listFacilities, type FacilityRow } from '@/server/services/facilities';

export const metadata = { title: 'Facilities' };

/**
 * Pickup and delivery places, free time and notes (docs/spec/screens.md, row
 * 22). Kept once and reused, which is what makes an appointment window mean
 * the same thing on every load that stops here.
 *
 * The map is not on this screen yet: geocoding and the draggable pin are a
 * later step of this phase, and the basemap is still the owner's decision.
 * Until then the chip says plainly whether a facility has been placed.
 */
const COLUMNS: Column<FacilityRow>[] = [
  {
    key: 'name',
    header: 'Facility',
    render: (facility) => (
      <TextLink href={`/customers/facilities/${facility.id}`}>{facility.name}</TextLink>
    ),
  },
  { key: 'address', header: 'Address', render: (facility) => facility.address },
  { key: 'timezone', header: 'Time zone', render: (facility) => timezoneLabel(facility.timezone) },
  {
    key: 'free',
    header: 'Free time',
    render: (facility) => detentionLabel(facility.detentionFreeMinutes),
  },
  {
    key: 'map',
    header: 'On the map',
    align: 'right',
    render: (facility) => {
      const look = geocodeLook(facility.geocodeStatus, facility.lat !== null);
      return (
        <StatusChip tone={look.tone} dot={look.tone === 'warning'}>
          {look.label}
        </StatusChip>
      );
    },
  },
];

export default async function FacilitiesPage() {
  const ctx = await requireSection('customers');
  const [facilities, customers] = await Promise.all([listFacilities(ctx), listCustomers(ctx)]);
  const empty = facilities.length === 0;

  return (
    <>
      <PageHeader
        title="Facilities"
        subtitle={`${facilities.length} ${facilities.length === 1 ? 'place' : 'places'} freight moves through`}
      >
        <SearchField />
        {empty ? null : (
          <Button variant="primary" href="/customers/facilities/new">
            New facility
          </Button>
        )}
      </PageHeader>

      <Tabs
        items={[
          { label: 'Customers', href: '/customers', count: customers.length },
          {
            label: 'Facilities',
            href: '/customers/facilities',
            active: true,
            count: facilities.length,
          },
        ]}
      />

      <Panel label="Facilities">
        <PanelHeader title="Facilities" count={facilities.length} />

        {empty ? (
          <EmptyState
            title="No facilities yet"
            hint="Add a dock once and every load that stops there reuses it."
            action={
              <Button variant="primary" href="/customers/facilities/new">
                New facility
              </Button>
            }
          />
        ) : (
          <DataTable columns={COLUMNS} rows={facilities} rowKey={(facility) => facility.id} />
        )}
      </Panel>
    </>
  );
}
