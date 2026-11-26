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
import { driverStatusLabel } from '@/domain/fleet';
import { requireSection } from '@/server/guard';
import { getDriver, listCompliance } from '@/server/services/fleet';
import { CompliancePanel, type PaperworkRow } from '../../compliance-panel';
import { DriverForm } from '../driver-form';
import { ArchiveDriver } from './archive';

export const metadata = { title: 'Driver' };

/**
 * The driver page (docs/spec/screens.md, row 13): profile and documents.
 *
 * Pay profile, deductions and load history are on that row too, and they wait
 * for the phases that build them — pay in phase 6, loads in phase 3. Nothing
 * here pretends they exist.
 *
 * Detail pattern from design/KIT.md: Breadcrumb, PageHeader with a status
 * chip, then Columns.
 */
export default async function DriverPage({ params }: { params: Promise<{ driverId: string }> }) {
  const ctx = await requireSection('fleet');
  const { driverId } = await params;

  const driver = await getDriver(ctx, driverId);
  if (driver === null) notFound();

  const documents = await listCompliance(ctx, 'driver', driverId);

  const rows: PaperworkRow[] = documents.map((document) => ({
    id: document.id,
    kind: document.kind,
    expiresOn: document.expiresOn,
    label: document.expiry === null || document.expiry.state === 'ok' ? null : document.expiry.label,
    tone: document.expiry !== null && document.expiry.state !== 'ok' ? 'warning' : 'idle',
    note: document.note,
  }));

  return (
    <>
      <Breadcrumb items={[{ label: 'Drivers', href: '/fleet' }, { label: driver.name }]} />

      <PageHeader
        title={driver.name}
        subtitle={driver.homeLocation === null ? undefined : `Home: ${driver.homeLocation}`}
        status={
          driver.worstExpiry === null ? (
            <StatusChip tone="idle">{driverStatusLabel(driver.status)}</StatusChip>
          ) : (
            <StatusChip tone="warning" dot>
              {driver.worstExpiry.label}
            </StatusChip>
          )
        }
      >
        <ArchiveDriver driverId={driver.id} name={driver.name} />
      </PageHeader>

      <Columns>
        <MainColumn>
          <Panel label="Details">
            <PanelHeader title="Details" />
            <DriverForm driver={driver} />
          </Panel>
        </MainColumn>

        <SideColumn>
          <Panel label="Paperwork">
            <PanelHeader title="Paperwork" count={rows.length} />
            <CompliancePanel subject="driver" subjectId={driver.id} documents={rows} />
          </Panel>
        </SideColumn>
      </Columns>
    </>
  );
}
