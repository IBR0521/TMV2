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
import { unitStatusLabel } from '@/domain/fleet';
import { requireSection } from '@/server/guard';
import { getTrailer, getTruck, listCompliance, listDrivers } from '@/server/services/fleet';
import { CompliancePanel, type PaperworkRow } from '../../compliance-panel';
import { TrailerForm, TruckForm } from '../unit-form';

export const metadata = { title: 'Unit' };

/**
 * The unit page (docs/spec/screens.md, row 15): documents and details.
 *
 * The service schedule, work orders and cost per mile are on that row too and
 * belong to later phases — maintenance is explicitly out of phase 2, and cost
 * per mile needs loads. Nothing here pretends otherwise.
 *
 * One route serves trucks and trailers: an id is looked up in both tables,
 * which keeps the URL in the list simple and means a bookmark never has to say
 * which kind of unit it was.
 */
export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const ctx = await requireSection('fleet');
  const { unitId } = await params;

  const [truck, trailer] = await Promise.all([getTruck(ctx, unitId), getTrailer(ctx, unitId)]);
  if (truck === null && trailer === null) notFound();

  const isTruck = truck !== null;
  const subject = isTruck ? 'truck' : 'trailer';
  const unitNumber = isTruck ? truck.unitNumber : (trailer?.unitNumber ?? '');
  const status = isTruck ? truck.status : (trailer?.status ?? 'active');
  const worstExpiry = isTruck ? truck.worstExpiry : (trailer?.worstExpiry ?? null);

  const [documents, drivers] = await Promise.all([
    listCompliance(ctx, subject, unitId),
    isTruck ? listDrivers(ctx) : Promise.resolve([]),
  ]);

  const rows: PaperworkRow[] = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    expiresOn: document.expiresOn,
    label: document.expiry === null || document.expiry.state === 'ok' ? null : document.expiry.label,
    tone: document.expiry !== null && document.expiry.state !== 'ok' ? 'warning' : 'idle',
    note: document.note,
    fileId: document.fileId,
  }));

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Trucks and trailers', href: '/fleet/units' },
          { label: `${isTruck ? 'Truck' : 'Trailer'} ${unitNumber}` },
        ]}
      />

      <PageHeader
        title={`${isTruck ? 'Truck' : 'Trailer'} ${unitNumber}`}
        status={
          worstExpiry === null ? (
            <StatusChip tone={status === 'active' ? 'idle' : 'warning'}>
              {unitStatusLabel(status)}
            </StatusChip>
          ) : (
            <StatusChip tone="warning" dot>
              {worstExpiry.label}
            </StatusChip>
          )
        }
      />

      <Columns>
        <MainColumn>
          <Panel label="Details">
            <PanelHeader title="Details" />
            {isTruck ? (
              <TruckForm
                truck={truck}
                drivers={drivers.map((driver) => ({ id: driver.id, name: driver.name }))}
              />
            ) : trailer === null ? null : (
              <TrailerForm trailer={trailer} />
            )}
          </Panel>
        </MainColumn>

        <SideColumn>
          <Panel label="Paperwork">
            <PanelHeader title="Paperwork" count={rows.length} />
            <CompliancePanel subject={subject} subjectId={unitId} documents={rows} />
          </Panel>
        </SideColumn>
      </Columns>
    </>
  );
}
