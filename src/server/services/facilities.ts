import type { Ctx } from '../context';
import { fail } from '../db/errors';
import { ActionError } from '../errors';
import * as audit from './audit';

/**
 * Facilities: the docks freight moves through, kept once and reused.
 *
 * Geocoding is not done here. Saving an address marks the row pending and a
 * worker job fills in the coordinates — once, and never again for the same
 * address (CLAUDE.md rule 5: geocode each address once, store and reuse).
 * A pin a person drags is marked manual, which no job overwrites.
 */
export type GeocodeStatus = 'pending' | 'found' | 'not_found' | 'manual';

export type FacilityRow = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  timezone: string;
  detentionFreeMinutes: number;
  notes: string | null;
  geocodeStatus: GeocodeStatus;
};

function toRow(data: {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  timezone: string;
  detention_free_minutes: number;
  notes: string | null;
  geocode_status: GeocodeStatus;
}): FacilityRow {
  return {
    id: data.id,
    name: data.name,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    timezone: data.timezone,
    detentionFreeMinutes: data.detention_free_minutes,
    notes: data.notes,
    geocodeStatus: data.geocode_status,
  };
}

const COLUMNS =
  'id, name, address, lat, lng, timezone, detention_free_minutes, notes, geocode_status';

export async function listFacilities(ctx: Ctx): Promise<FacilityRow[]> {
  const { data, error } = await ctx.db
    .from('facilities')
    .select(COLUMNS)
    .eq('company_id', ctx.companyId)
    .is('archived_at', null)
    .order('name', { ascending: true });

  if (error) fail(error, 'The facilities could not be read.');
  return data.map(toRow);
}

export async function getFacility(ctx: Ctx, facilityId: string): Promise<FacilityRow | null> {
  const { data, error } = await ctx.db
    .from('facilities')
    .select(COLUMNS)
    .eq('company_id', ctx.companyId)
    .eq('id', facilityId)
    .maybeSingle();

  if (error) fail(error, 'That facility could not be read.');
  return data === null ? null : toRow(data);
}

export type FacilityInput = {
  id?: string;
  name: string;
  address: string;
  timezone: string;
  detentionFreeMinutes: number;
  notes: string | null;
};

export async function saveFacility(ctx: Ctx, input: FacilityInput): Promise<string> {
  const base = {
    company_id: ctx.companyId,
    name: input.name,
    address: input.address,
    timezone: input.timezone,
    detention_free_minutes: input.detentionFreeMinutes,
    notes: input.notes,
  };

  if (input.id === undefined) {
    const { data, error } = await ctx.db
      .from('facilities')
      .insert({ ...base, geocode_status: 'pending' })
      .select('id')
      .single();

    if (error) fail(error, 'That facility could not be added.');
    await audit.record(ctx, {
      action: 'facility.created',
      subjectType: 'facility',
      subjectId: data.id,
      after: base,
    });
    return data.id;
  }

  const existing = await getFacility(ctx, input.id);
  if (existing === null) throw new ActionError('That facility no longer exists.');

  // Only a changed address needs geocoding again. Editing the free time or the
  // notes must not throw away a pin someone placed by hand.
  const addressChanged = existing.address.trim() !== input.address.trim();
  const row = addressChanged
    ? { ...base, geocode_status: 'pending' as const, lat: null, lng: null, geocoded_at: null }
    : base;

  const { data, error } = await ctx.db
    .from('facilities')
    .update(row)
    .eq('company_id', ctx.companyId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That facility could not be saved.');
  if (data === null) throw new ActionError('That facility no longer exists.');

  await audit.record(ctx, {
    action: 'facility.updated',
    subjectType: 'facility',
    subjectId: data.id,
    before: { address: existing.address },
    after: row,
  });
  return data.id;
}

/**
 * Where the geocoder missed and someone put the pin instead.
 *
 * Marked manual, so the daily job leaves it alone for good.
 */
export async function placeFacilityPin(
  ctx: Ctx,
  facilityId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { data, error } = await ctx.db
    .from('facilities')
    .update({
      lat,
      lng,
      geocode_status: 'manual',
      geocoded_at: new Date().toISOString(),
    })
    .eq('company_id', ctx.companyId)
    .eq('id', facilityId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That pin could not be saved.');
  if (data === null) throw new ActionError('That facility no longer exists.');

  await audit.record(ctx, {
    action: 'facility.pinned',
    subjectType: 'facility',
    subjectId: facilityId,
    after: { lat, lng },
  });
}

export async function archiveFacility(ctx: Ctx, facilityId: string): Promise<void> {
  const { data, error } = await ctx.db
    .from('facilities')
    .update({ archived_at: new Date().toISOString() })
    .eq('company_id', ctx.companyId)
    .eq('id', facilityId)
    .select('id')
    .maybeSingle();

  if (error) fail(error, 'That facility could not be archived.');
  if (data === null) throw new ActionError('That facility no longer exists.');

  await audit.record(ctx, {
    action: 'facility.archived',
    subjectType: 'facility',
    subjectId: facilityId,
  });
}
