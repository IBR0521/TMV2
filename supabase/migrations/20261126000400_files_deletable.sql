-- Phase 2 — a file may be taken back.
--
-- Phase 1 created `files` with select, insert and update and no delete, which
-- was right when nothing uploaded anything: a record of a stored object should
-- not be rewritable at will.
--
-- Uploads change that. A scan of a licence attached to the wrong driver has to
-- be removable, object and row together, and `compliance_documents` is already
-- deletable for the same reason. A file is not a financial record; the audit
-- log keeps the fact that it was there.

grant delete on table public.files to authenticated;

create policy tenant_delete on public.files
  for delete to authenticated
  using (company_id in (select public.auth_company_ids()));

comment on table public.files is
  'One row per object in Supabase Storage. Removable, unlike the financial '
  'records: a document attached to the wrong unit should not have to stay.';
