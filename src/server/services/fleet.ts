import {
  type ComplianceKind,
  type ComplianceSubject,
  type DriverStatus,
  type DriverType,
  type Expiry,
  type TrailerType,
  type UnitStatus,
  complianceKindFits,
  expiryOf,
} from '@/domain/fleet';
import { truckLimitProblem } from '@/domain/plan';
import type { Ctx } from '../context';
import { todayInZone } from '../clock';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';
import { getEntitlements } from './entitlements';

/**
 * The fleet: drivers, trucks, trailers and the paperwork that expires.
 *
 * Every function takes ctx and reads company_id from it, never from input
 * (CLAUDE.md rule 1). RLS checks it again in the database, so a mistake here
 * returns nothing rather than someone else's rows.
 *
 * Master data is archived, never deleted. The tables grant no delete at all,
 * so archiving is not a convention anyone can forget.
 */
export type DriverRow = {
  id: string;
  name: string;
  phone: string | null;
  type: DriverType;
  status: DriverStatus;
  homeLocation: string | null;
  /** The soonest-expiring piece of paperwork, if any of it is worth showing. */
  worstExpiry: (Expiry & { kind: ComplianceKind }) | null;
  truckUnit: string | null;
};

export type TruckRow = {
  id: string;
  unitNumber: string;
  vin: string | null;
  plate: string | null;
  status: UnitStatus;
  odometerMiles: number | null;
  ownerDriverId: string | null;
  ownerDriverName: string | null;
  worstExpiry: (Expiry & { kind: ComplianceKind }) | null;
};

export type TrailerRow = {
  id: string;
  unitNumber: string;
  type: TrailerType;
  status: UnitStatus;
  worstExpiry: (Expiry & { kind: ComplianceKind }) | null;
};

export type ComplianceRow = {
  id: string;
  subject: ComplianceSubject;
  subjectId: string;
  kind: ComplianceKind;
  expiresOn: string | null;
  expiry: Expiry | null;
  fileId: string | null;
  note: string | null;
};

type DocumentLink = { driver_id: string | null; truck_id: string | null; trailer_id: string | null };

/**
 * Every document of a company in one read, keyed by the row it belongs to.
 *
 * Two queries and a join here beats a nested select: compliance_documents
 * reaches three tables, and stitching in TypeScript is easier to follow than
 * the embed hints that would be needed to disambiguate it.
 */
async function documentsBySubject(
  ctx: Ctx,
  today: string,
): Promise<Map<string, (Expiry & { kind: ComplianceKind })[]>> {
  const { data, error } = await ctx.db
    .from('compliance_documents')
    .select('kind, expires_on, driver_id, truck_id, trailer_id')
    .eq('company_id', ctx.companyId)
    .not('expires_on', 'is', null);

  if (error) fail(error, 'The compliance documents could not be read.');

  const out = new Map<string, (Expiry & { kind: ComplianceKind })[]>();
  for (const row of data) {
    const subjectId = row.driver_id ?? row.truck_id ?? row.trailer_id;
    if (subjectId === null) continue;

    const expiry = expiryOf(row.expires_on, today);
    if (expiry === null) continue;

    const list = out.get(subjectId) ?? [];
    list.push({ ...expiry, kind: row.kind });
    out.set(subjectId, list);
  }
  return out;
}

/** The one worth a chip: soonest first, and nothing if it is all months away. */
function worstOf(
  documents: (Expiry & { kind: ComplianceKind })[] | undefined,
): (Expiry & { kind: ComplianceKind }) | null {
  if (documents === undefined || documents.length === 0) return null;
  const sorted = [...documents].sort((a, b) => a.daysLeft - b.daysLeft);
  const worst = sorted[0];
  if (worst === undefined || worst.state === 'ok') return null;
  return worst;
}

async function companyToday(ctx: Ctx): Promise<string> {
  const { data, error } = await ctx.db
    .from('companies')
    .select('timezone')
    .eq('id', ctx.companyId)
    .single();

  if (error) fail(error, 'This company could not be read.');
  return todayInZone(data.timezone);
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------
export async function listDrivers(ctx: Ctx): Promise<DriverRow[]> {
  const today = await companyToday(ctx);

  const [drivers, trucks, documents] = await Promise.all([
    ctx.db
      .from('drivers')
      .select('id, name, phone, type, status, home_location')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .order('name', { ascending: true }),
    ctx.db
      .from('trucks')
      .select('unit_number, owner_driver_id')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .not('owner_driver_id', 'is', null),
    documentsBySubject(ctx, today),
  ]);

  if (drivers.error) fail(drivers.error, 'The drivers could not be read.');
  if (trucks.error) fail(trucks.error, 'The trucks could not be read.');

  const unitByDriver = new Map(
    trucks.data.flatMap((row) =>
      row.owner_driver_id === null ? [] : [[row.owner_driver_id, row.unit_number] as const],
    ),
  );

  return drivers.data.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type,
    status: row.status,
    homeLocation: row.home_location,
    worstExpiry: worstOf(documents.get(row.id)),
    truckUnit: unitByDriver.get(row.id) ?? null,
  }));
}

export async function getDriver(ctx: Ctx, driverId: string): Promise<DriverRow | null> {
  const today = await companyToday(ctx);

  const { data, error } = await ctx.db
    .from('drivers')
    .select('id, name, phone, type, status, home_location')
    .eq('company_id', ctx.companyId)
    .eq('id', driverId)
    .maybeSingle();

  if (error) fail(error, 'That driver could not be read.');
  if (data === null) return null;

  const documents = await documentsBySubject(ctx, today);

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    type: data.type,
    status: data.status,
    homeLocation: data.home_location,
    worstExpiry: worstOf(documents.get(data.id)),
    truckUnit: null,
  };
}

export type DriverInput = {
  id?: string;
  name: string;
  phone: string | null;
  type: DriverType;
  status: DriverStatus;
  homeLocation: string | null;
};

/** One function behind one form: an id means edit, no id means new. */
export async function saveDriver(ctx: Ctx, input: DriverInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    name: input.name,
    phone: input.phone,
    type: input.type,
    status: input.status,
    home_location: input.homeLocation,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('drivers').insert(row).select('id').single();
    if (error) fail(error, 'That driver could not be added.');
    await audit.record(ctx, { action: 'driver.created', subjectType: 'driver', subjectId: data.id, after: row });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('drivers')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That driver could not be saved.');
  if (data === null) throw new ActionError('That driver no longer exists.');

  await audit.record(ctx, { action: 'driver.updated', subjectType: 'driver', subjectId: data.id, after: row });
  return data.id;
}

export async function archiveDriver(ctx: Ctx, driverId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('drivers')
    .update({ archived_at: new Date().toISOString(), status: 'inactive' })
    .eq('company_id', ctx.companyId)
    .eq('id', driverId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That driver could not be archived.');
  if (data === null) throw new ActionError('That driver no longer exists.');

  await audit.record(ctx, { action: 'driver.archived', subjectType: 'driver', subjectId: driverId });
}

// ---------------------------------------------------------------------------
// Trucks
// ---------------------------------------------------------------------------
export async function listTrucks(ctx: Ctx): Promise<TruckRow[]> {
  const today = await companyToday(ctx);

  const [trucks, drivers, documents] = await Promise.all([
    ctx.db
      .from('trucks')
      .select('id, unit_number, vin, plate, status, odometer_miles, owner_driver_id')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .order('unit_number', { ascending: true }),
    ctx.db.from('drivers').select('id, name').eq('company_id', ctx.companyId),
    documentsBySubject(ctx, today),
  ]);

  if (trucks.error) fail(trucks.error, 'The trucks could not be read.');
  if (drivers.error) fail(drivers.error, 'The drivers could not be read.');

  const nameById = new Map(drivers.data.map((row) => [row.id, row.name] as const));

  return trucks.data.map((row) => ({
    id: row.id,
    unitNumber: row.unit_number,
    vin: row.vin,
    plate: row.plate,
    status: row.status,
    odometerMiles: row.odometer_miles,
    ownerDriverId: row.owner_driver_id,
    ownerDriverName: row.owner_driver_id === null ? null : nameById.get(row.owner_driver_id) ?? null,
    worstExpiry: worstOf(documents.get(row.id)),
  }));
}

export async function getTruck(ctx: Ctx, truckId: string): Promise<TruckRow | null> {
  const today = await companyToday(ctx);

  const { data, error } = await ctx.db
    .from('trucks')
    .select('id, unit_number, vin, plate, status, odometer_miles, owner_driver_id')
    .eq('company_id', ctx.companyId)
    .eq('id', truckId)
    .maybeSingle();

  if (error) fail(error, 'That truck could not be read.');
  if (data === null) return null;

  const documents = await documentsBySubject(ctx, today);

  return {
    id: data.id,
    unitNumber: data.unit_number,
    vin: data.vin,
    plate: data.plate,
    status: data.status,
    odometerMiles: data.odometer_miles,
    ownerDriverId: data.owner_driver_id,
    ownerDriverName: null,
    worstExpiry: worstOf(documents.get(data.id)),
  };
}

export type TruckInput = {
  id?: string;
  unitNumber: string;
  vin: string | null;
  plate: string | null;
  status: UnitStatus;
  odometerMiles: number | null;
  ownerDriverId: string | null;
};

/**
 * The truck limit, checked here and nowhere else.
 *
 * CLAUDE.md rule 6: the subscriptions row is the only source of the limit, and
 * during the trial there is none. Only a truck becoming active counts — a
 * carrier may keep as many retired units on record as they like.
 */
async function assertTruckAllowed(ctx: Ctx, truckId: string | undefined): Promise<void> {
  const entitlements = await getEntitlements(ctx);
  if (entitlements.status === 'trialing') return;

  const { count, error } = await ctx.db
    .from('trucks')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', ctx.companyId)
    .eq('status', 'active')
    .is('archived_at', null);

  if (error) fail(error, 'The trucks could not be counted.');

  const problem = truckLimitProblem({
    status: entitlements.status,
    truckLimit: entitlements.truckLimit,
    activeTrucks: count ?? 0,
    alreadyActive: truckId !== undefined && (await isActiveTruck(ctx, truckId)),
  });

  if (problem !== null) throw new ActionError(problem);
}

async function isActiveTruck(ctx: Ctx, truckId: string): Promise<boolean> {
  const { data, error } = await ctx.db
    .from('trucks')
    .select('status')
    .eq('company_id', ctx.companyId)
    .eq('id', truckId)
    .maybeSingle();

  if (error) fail(error, 'That truck could not be read.');
  return data?.status === 'active';
}

export async function saveTruck(ctx: Ctx, input: TruckInput): Promise<string> {
  if (input.status === 'active') await assertTruckAllowed(ctx, input.id);

  const row = {
    company_id: ctx.companyId,
    unit_number: input.unitNumber,
    vin: input.vin,
    plate: input.plate,
    status: input.status,
    odometer_miles: input.odometerMiles,
    owner_driver_id: input.ownerDriverId,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('trucks').insert(row).select('id').single();
    if (error) fail(error, `Unit ${input.unitNumber} is already on the list.`);
    await audit.record(ctx, { action: 'truck.created', subjectType: 'truck', subjectId: data.id, after: row });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('trucks')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, `Unit ${input.unitNumber} is already on the list.`);
  if (data === null) throw new ActionError('That truck no longer exists.');

  await audit.record(ctx, { action: 'truck.updated', subjectType: 'truck', subjectId: data.id, after: row });
  return data.id;
}

export async function archiveTruck(ctx: Ctx, truckId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('trucks')
    .update({ archived_at: new Date().toISOString(), status: 'inactive' })
    .eq('company_id', ctx.companyId)
    .eq('id', truckId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That truck could not be archived.');
  if (data === null) throw new ActionError('That truck no longer exists.');

  await audit.record(ctx, { action: 'truck.archived', subjectType: 'truck', subjectId: truckId });
}

// ---------------------------------------------------------------------------
// Trailers
// ---------------------------------------------------------------------------
export async function listTrailers(ctx: Ctx): Promise<TrailerRow[]> {
  const today = await companyToday(ctx);

  const [trailers, documents] = await Promise.all([
    ctx.db
      .from('trailers')
      .select('id, unit_number, type, status')
      .eq('company_id', ctx.companyId)
      .is('archived_at', null)
      .order('unit_number', { ascending: true }),
    documentsBySubject(ctx, today),
  ]);

  if (trailers.error) fail(trailers.error, 'The trailers could not be read.');

  return trailers.data.map((row) => ({
    id: row.id,
    unitNumber: row.unit_number,
    type: row.type,
    status: row.status,
    worstExpiry: worstOf(documents.get(row.id)),
  }));
}

export async function getTrailer(ctx: Ctx, trailerId: string): Promise<TrailerRow | null> {
  const today = await companyToday(ctx);

  const { data, error } = await ctx.db
    .from('trailers')
    .select('id, unit_number, type, status')
    .eq('company_id', ctx.companyId)
    .eq('id', trailerId)
    .maybeSingle();

  if (error) fail(error, 'That trailer could not be read.');
  if (data === null) return null;

  const documents = await documentsBySubject(ctx, today);

  return {
    id: data.id,
    unitNumber: data.unit_number,
    type: data.type,
    status: data.status,
    worstExpiry: worstOf(documents.get(data.id)),
  };
}

export type TrailerInput = {
  id?: string;
  unitNumber: string;
  type: TrailerType;
  status: UnitStatus;
};

export async function saveTrailer(ctx: Ctx, input: TrailerInput): Promise<string> {
  const row = {
    company_id: ctx.companyId,
    unit_number: input.unitNumber,
    type: input.type,
    status: input.status,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db.from('trailers').insert(row).select('id').single();
    if (error) fail(error, `Trailer ${input.unitNumber} is already on the list.`);
    await audit.record(ctx, { action: 'trailer.created', subjectType: 'trailer', subjectId: data.id, after: row });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('trailers')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, `Trailer ${input.unitNumber} is already on the list.`);
  if (data === null) throw new ActionError('That trailer no longer exists.');

  await audit.record(ctx, { action: 'trailer.updated', subjectType: 'trailer', subjectId: data.id, after: row });
  return data.id;
}

export async function archiveTrailer(ctx: Ctx, trailerId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('trailers')
    .update({ archived_at: new Date().toISOString(), status: 'inactive' })
    .eq('company_id', ctx.companyId)
    .eq('id', trailerId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That trailer could not be archived.');
  if (data === null) throw new ActionError('That trailer no longer exists.');

  await audit.record(ctx, { action: 'trailer.archived', subjectType: 'trailer', subjectId: trailerId });
}

// ---------------------------------------------------------------------------
// Compliance documents
// ---------------------------------------------------------------------------
export async function listCompliance(
  ctx: Ctx,
  subject: ComplianceSubject,
  subjectId: string,
): Promise<ComplianceRow[]> {
  const today = await companyToday(ctx);
  const column = `${subject}_id` as const;

  const { data, error } = await ctx.db
    .from('compliance_documents')
    .select('id, kind, expires_on, file_id, note, driver_id, truck_id, trailer_id')
    .eq('company_id', ctx.companyId)
    .eq(column, subjectId)
    .order('expires_on', { ascending: true, nullsFirst: false });

  if (error) fail(error, 'The documents could not be read.');

  return data.map((row) => ({
    id: row.id,
    subject,
    subjectId,
    kind: row.kind,
    expiresOn: row.expires_on,
    expiry: expiryOf(row.expires_on, today),
    fileId: row.file_id,
    note: row.note,
  }));
}

export type ComplianceInput = {
  id?: string;
  subject: ComplianceSubject;
  subjectId: string;
  kind: ComplianceKind;
  expiresOn: string | null;
  fileId: string | null;
  note: string | null;
};

export async function saveComplianceDocument(ctx: Ctx, input: ComplianceInput): Promise<string> {
  if (!complianceKindFits(input.kind, input.subject)) {
    throw new ActionError('That kind of document does not belong to that unit.');
  }

  const link: DocumentLink = { driver_id: null, truck_id: null, trailer_id: null };
  link[`${input.subject}_id`] = input.subjectId;

  const row = {
    company_id: ctx.companyId,
    ...link,
    kind: input.kind,
    expires_on: input.expiresOn,
    file_id: input.fileId,
    note: input.note,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db
      .from('compliance_documents')
      .insert(row)
      .select('id')
      .single();
    if (error) fail(error, 'That document could not be saved.');
    await audit.record(ctx, {
      action: 'compliance.created',
      subjectType: input.subject,
      subjectId: input.subjectId,
      after: row,
    });
    return data.id;
  }

  const { data, error } = await ctx.db
    .from('compliance_documents')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That document could not be saved.');
  if (data === null) throw new ActionError('That document no longer exists.');

  await audit.record(ctx, {
    action: 'compliance.updated',
    subjectType: input.subject,
    subjectId: input.subjectId,
    after: row,
  });
  return data.id;
}

/**
 * A compliance document may be removed, unlike master data: it is a scan of a
 * card, and one attached to the wrong driver should not have to stay there.
 */
export async function removeComplianceDocument(ctx: Ctx, documentId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('compliance_documents')
    .delete()
    .eq('company_id', ctx.companyId)
    .eq('id', documentId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That document could not be removed.');
  if (data === null) throw new ActionError('That document no longer exists.');

  await audit.record(ctx, {
    action: 'compliance.removed',
    subjectType: 'compliance_document',
    subjectId: documentId,
  });
}
