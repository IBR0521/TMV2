-- Phase 3a — a document outlives the load it was filed against.
--
-- documents points at a load with a composite key, (company_id, load_id), and
-- was written ON DELETE SET NULL so that deleting a draft load would leave its
-- scanned rate con behind rather than destroying it.
--
-- That is not what SET NULL does to a composite key. It nulls *every* column
-- in the key, company_id included — and company_id is NOT NULL, so deleting
-- any load with a document attached failed outright:
--
--   null value in column "company_id" of relation "documents"
--
-- Postgres 15 added a column list for exactly this. Naming the column means
-- only that column is cleared, and the document stays where it belongs: with
-- its carrier, detached from the load.

alter table public.documents
  drop constraint documents_company_id_load_id_fkey,
  add constraint documents_company_id_load_id_fkey
    foreign key (company_id, load_id) references public.loads (company_id, id)
    on delete set null (load_id);

alter table public.documents
  drop constraint documents_company_id_stop_id_fkey,
  add constraint documents_company_id_stop_id_fkey
    foreign key (company_id, stop_id) references public.load_stops (company_id, id)
    on delete set null (stop_id);

comment on constraint documents_company_id_load_id_fkey on public.documents is
  'Deleting a load detaches its documents rather than destroying them, and '
  'leaves them with their carrier.';
