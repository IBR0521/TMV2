-- Phase 2 — where uploaded documents live.
--
-- docs/build-plan.md, phase 2 step 3: an upload widget for compliance
-- documents with expiry dates (Supabase Storage, files table).
--
-- One private bucket for every carrier's documents. Isolation works exactly as
-- it does in the database, and for the same reason: every object's path
-- begins with the company id, and the policies below only let a session touch
-- a folder belonging to a company it is a member of. A carrier cannot read,
-- write or delete another carrier's objects even with a guessed path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  -- 25 MB: a photo of a CDL or a scanned rate confirmation, not a video.
  26_214_400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------
-- storage.foldername(name) splits the object path; [1] is the first folder,
-- which is the company id. auth_company_ids() returns office memberships only,
-- so a driver reaches nothing here — the driver app gets its own narrow
-- policies in phase 4, when it has something to upload.
--
-- The comparison is made as text rather than casting the path to uuid: the
-- path comes from whoever is asking, and a malformed one must be refused, not
-- raise an error out of the policy.

create policy documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (select public.auth_company_ids()::text)
  );

create policy documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (select public.auth_company_ids()::text)
  );

create policy documents_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (select public.auth_company_ids()::text)
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (select public.auth_company_ids()::text)
  );

-- Deleting the object is how a document that was attached to the wrong driver
-- is undone; the compliance_documents row goes with it.
create policy documents_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (select public.auth_company_ids()::text)
  );
