-- Phase 1 — the three tables every later module leans on.
--
-- audit_log       append-only record of who did what (and how to undo it)
-- number_sequences human-readable load, invoice and settlement numbers
-- files            one row per stored upload

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_type text not null check (actor_type in ('user', 'automation', 'system')),
  actor_id uuid references public.users (id),
  action text not null,
  subject_type text not null,
  subject_id uuid,
  before jsonb,
  after jsonb,
  -- What an automated action needs in order to be undone (CLAUDE.md rule 4).
  undo jsonb,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  constraint audit_log_user_has_actor check (actor_type <> 'user' or actor_id is not null)
);

create index audit_log_company_id_idx on public.audit_log (company_id, created_at desc);
create index audit_log_subject_idx on public.audit_log (company_id, subject_type, subject_id);

comment on table public.audit_log is
  'Append-only. Automated actions are written with actor_type = automation and '
  'carry what is needed to undo them.';

-- ---------------------------------------------------------------------------
-- number_sequences
-- ---------------------------------------------------------------------------
-- CLAUDE.md rule 2: load, invoice and settlement numbers come from here, per
-- company, so two carriers both have a load #1001.
create table public.number_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (name in ('load', 'invoice', 'settlement')),
  prefix text not null default '',
  next_value bigint not null default 1000 check (next_value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, name)
);

create index number_sequences_company_id_idx on public.number_sequences (company_id);

create trigger number_sequences_touch_updated_at
  before update on public.number_sequences
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.number_sequences is
  'Per-company counters. A service claims the next number with an UPDATE ... '
  'RETURNING under RLS; no privileged function is involved.';

-- ---------------------------------------------------------------------------
-- files
-- ---------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  storage_path text not null,
  mime text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  -- SHA-256 of the bytes: the same document uploaded twice is read by AI once.
  sha256 text,
  uploaded_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, storage_path)
);

create index files_company_id_idx on public.files (company_id, created_at desc);
create index files_sha256_idx on public.files (company_id, sha256) where sha256 is not null;

comment on table public.files is
  'One row per object in Supabase Storage. Uploads themselves start in phase 2.';

select public.tm_apply_tenant_rls('audit_log', 'select,insert');
select public.tm_apply_tenant_rls('number_sequences', 'select,update');
select public.tm_apply_tenant_rls('files', 'select,insert,update');
