import { beforeAll, describe, expect, it } from 'vitest';
import { adminDb, createCarrier, type Carrier, type Db } from '../support/supabase';

/**
 * The documents bucket, isolated the same way the tables are.
 *
 * Every object's path begins with the company id, and the storage policies
 * only let a session touch a folder of a company it belongs to. This is worth
 * its own test rather than trusting the policy text: a storage policy that
 * does not work is not a bug, it is one carrier reading another carrier's
 * scanned licences.
 */
const admin: Db = adminDb();
const BUCKET = 'documents';

let alpha: Carrier;
let beta: Carrier;

function file(text: string): Blob {
  return new Blob([text], { type: 'application/pdf' });
}

beforeAll(async () => {
  [alpha, beta] = await Promise.all([createCarrier(admin, 'Store'), createCarrier(admin, 'Rival')]);
}, 120_000);

describe('a carrier’s own folder', () => {
  it('takes an upload from the office', async () => {
    const { error } = await alpha.people.owner.db.storage
      .from(BUCKET)
      .upload(`${alpha.companyId}/own.pdf`, file('alpha'), { upsert: true });

    expect(error).toBeNull();
  });

  it('is readable by a colleague', async () => {
    await alpha.people.owner.db.storage
      .from(BUCKET)
      .upload(`${alpha.companyId}/shared.pdf`, file('alpha'), { upsert: true });

    const { data, error } = await alpha.people.dispatcher.db.storage
      .from(BUCKET)
      .download(`${alpha.companyId}/shared.pdf`);

    expect(error).toBeNull();
    expect(await data?.text()).toBe('alpha');
  });
});

describe('a signed link', () => {
  it('opens the document for the office, and nothing else', async () => {
    const path = `${alpha.companyId}/signed.pdf`;
    await alpha.people.owner.db.storage
      .from(BUCKET)
      .upload(path, file('alpha signed'), { upsert: true });

    const signed = await alpha.people.owner.db.storage.from(BUCKET).createSignedUrl(path, 300);
    expect(signed.error).toBeNull();

    const fetched = await fetch(signed.data?.signedUrl ?? '');
    expect(fetched.ok).toBe(true);
    expect(await fetched.text()).toBe('alpha signed');
  });

  it('cannot be asked for by another carrier', async () => {
    const path = `${alpha.companyId}/signed.pdf`;
    const signed = await beta.people.owner.db.storage.from(BUCKET).createSignedUrl(path, 300);

    expect(signed.error).not.toBeNull();
    expect(signed.data).toBeNull();
  });
});

describe('another carrier’s folder', () => {
  beforeAll(async () => {
    const { error } = await alpha.people.owner.db.storage
      .from(BUCKET)
      .upload(`${alpha.companyId}/secret.pdf`, file('alpha secret'), { upsert: true });
    expect(error).toBeNull();
  });

  it('cannot be written to', async () => {
    const { error } = await beta.people.owner.db.storage
      .from(BUCKET)
      .upload(`${alpha.companyId}/planted.pdf`, file('from beta'));

    expect(error).not.toBeNull();

    // Judged by the data, not the message: nothing of beta's is in alpha's folder.
    const { data } = await admin.storage.from(BUCKET).list(alpha.companyId);
    expect(data?.map((object) => object.name)).not.toContain('planted.pdf');
  });

  it('cannot be read', async () => {
    const { data, error } = await beta.people.owner.db.storage
      .from(BUCKET)
      .download(`${alpha.companyId}/secret.pdf`);

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('cannot be listed', async () => {
    const { data } = await beta.people.owner.db.storage.from(BUCKET).list(alpha.companyId);

    expect(data ?? []).toEqual([]);
  });

  it('cannot be deleted', async () => {
    await beta.people.owner.db.storage.from(BUCKET).remove([`${alpha.companyId}/secret.pdf`]);

    const { data } = await admin.storage.from(BUCKET).list(alpha.companyId);
    expect(data?.map((object) => object.name)).toContain('secret.pdf');
  });
});

describe('a driver', () => {
  // auth_company_ids() is office-only, so the whole bucket is closed to
  // drivers until phase 4 gives the driver app its own narrow policies.
  it('reaches nothing in the bucket', async () => {
    const { data } = await alpha.people.driver.db.storage.from(BUCKET).list(alpha.companyId);
    expect(data ?? []).toEqual([]);

    const { error } = await alpha.people.driver.db.storage
      .from(BUCKET)
      .upload(`${alpha.companyId}/from-driver.pdf`, file('driver'));
    expect(error).not.toBeNull();
  });
});

describe('a path that is not a company', () => {
  it('is refused rather than raising', async () => {
    const { error } = await alpha.people.owner.db.storage
      .from(BUCKET)
      .upload('not-a-uuid/anything.pdf', file('nowhere'));

    expect(error).not.toBeNull();
  });
});
