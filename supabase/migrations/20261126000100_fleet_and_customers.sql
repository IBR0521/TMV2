-- Phase 2 — fleet and customers: everything a load will point at.
--
-- docs/spec/spec.md, Data model (Fleet and Customers groups).
-- docs/build-plan.md, Phase 2, step 1.
--
-- Every table here but one is tenant-scoped and declared so with
-- tm_apply_tenant_rls(), which refuses a table that lacks a NOT NULL
-- company_id, an index led by company_id, or a unique (company_id, id).
-- fmcsa_carriers is the exception: public federal data, the same for every
-- carrier, so it is global and gets its own read-only policy.
--
-- Master data is archived, never deleted (CLAUDE.md rule 2), so drivers,
-- trucks, trailers, customers and facilities are granted select, insert and
-- update only. Their children — contacts, compliance documents, import
-- mappings — may be removed, because removing a wrongly entered one is not
-- destroying a record of the business.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.driver_type as enum ('company', 'owner_operator');
create type public.driver_status as enum ('active', 'inactive');
create type public.unit_status as enum ('active', 'inactive', 'in_shop');
create type public.trailer_type as enum ('dry_van', 'reefer', 'flatbed');
create type public.compliance_kind as enum (
  'cdl', 'medical', 'registration', 'insurance', 'inspection'
);
create type public.customer_type as enum ('broker', 'shipper');
create type public.invoice_send_mode as enum ('email', 'own_portal');
create type public.geocode_status as enum ('pending', 'found', 'not_found', 'manual');
create type public.import_kind as enum ('trucks', 'drivers', 'customers');

-- ---------------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------------
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  phone text,
  type public.driver_type not null default 'company',
  status public.driver_status not null default 'active',
  -- Where this driver goes home, as the office writes it ("Laredo, TX").
  -- Phase 3 weighs it when ranking dispatch suggestions; phase 2 only keeps
  -- and shows it.
  home_location text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create index drivers_company_name_idx on public.drivers (company_id, name);
create index drivers_company_status_idx on public.drivers (company_id, status)
  where archived_at is null;

create trigger drivers_touch_updated_at
  before update on public.drivers
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.drivers is
  'A driver. Archived, never deleted; a membership links one to a login.';
comment on column public.drivers.type is
  'company: on the payroll. owner_operator: brings their own truck.';

-- memberships.driver_id has been waiting for this table since phase 1. The key
-- is composite, so a login can only ever be tied to a driver of its own
-- carrier.
alter table public.memberships
  add constraint memberships_driver_fkey
  foreign key (company_id, driver_id) references public.drivers (company_id, id);

-- ---------------------------------------------------------------------------
-- trucks
-- ---------------------------------------------------------------------------
create table public.trucks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  unit_number text not null check (length(btrim(unit_number)) > 0),
  vin text check (vin is null or length(btrim(vin)) = 17),
  plate text,
  status public.unit_status not null default 'active',
  -- Set when an owner-operator drives their own truck.
  owner_driver_id uuid,
  odometer_miles integer check (odometer_miles is null or odometer_miles >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, owner_driver_id) references public.drivers (company_id, id)
);

create index trucks_company_unit_idx on public.trucks (company_id, unit_number);
create index trucks_company_owner_idx on public.trucks (company_id, owner_driver_id)
  where owner_driver_id is not null;

-- A retired unit number can be reused; two live trucks cannot share one.
create unique index trucks_live_unit_number_idx
  on public.trucks (company_id, upper(btrim(unit_number)))
  where archived_at is null;

create trigger trucks_touch_updated_at
  before update on public.trucks
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.trucks is 'A power unit. Archived, never deleted.';
comment on column public.trucks.odometer_miles is
  'Last reading the office entered. Phase 7 computes cost per mile from loads, '
  'not from this.';

-- ---------------------------------------------------------------------------
-- trailers
-- ---------------------------------------------------------------------------
create table public.trailers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  unit_number text not null check (length(btrim(unit_number)) > 0),
  type public.trailer_type not null default 'dry_van',
  status public.unit_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create index trailers_company_unit_idx on public.trailers (company_id, unit_number);

create unique index trailers_live_unit_number_idx
  on public.trailers (company_id, upper(btrim(unit_number)))
  where archived_at is null;

create trigger trailers_touch_updated_at
  before update on public.trailers
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.trailers is 'A trailer. Archived, never deleted.';

-- ---------------------------------------------------------------------------
-- compliance_documents
-- ---------------------------------------------------------------------------
-- The spec describes this table as subject_type plus subject_id. A single
-- polymorphic subject_id cannot carry a foreign key, and CLAUDE.md rule 1
-- requires composite keys between tenant tables — so the subject is stored as
-- three nullable keys with "exactly one" enforced, and subject_type and
-- subject_id are generated from them. Reads look as the spec says; writes
-- cannot point at a row that does not exist, or at another carrier's.
create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  driver_id uuid,
  truck_id uuid,
  trailer_id uuid,
  subject_type text generated always as (
    case
      when driver_id is not null then 'driver'
      when truck_id is not null then 'truck'
      else 'trailer'
    end
  ) stored,
  subject_id uuid generated always as (
    coalesce(driver_id, truck_id, trailer_id)
  ) stored,
  kind public.compliance_kind not null,
  -- Null for paperwork that does not expire. The expiry rule only ever looks
  -- at rows where this is set.
  expires_on date,
  file_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_documents_one_subject
    check (num_nonnulls(driver_id, truck_id, trailer_id) = 1),
  unique (company_id, id),
  foreign key (company_id, driver_id)
    references public.drivers (company_id, id) on delete cascade,
  foreign key (company_id, truck_id)
    references public.trucks (company_id, id) on delete cascade,
  foreign key (company_id, trailer_id)
    references public.trailers (company_id, id) on delete cascade,
  foreign key (company_id, file_id) references public.files (company_id, id)
);

create index compliance_documents_company_expiry_idx
  on public.compliance_documents (company_id, expires_on)
  where expires_on is not null;
create index compliance_documents_subject_idx
  on public.compliance_documents (company_id, subject_type, subject_id);

create trigger compliance_documents_touch_updated_at
  before update on public.compliance_documents
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.compliance_documents is
  'Expiring paperwork for a driver, truck or trailer. The compliance.expiring '
  'rule reads it daily.';
comment on column public.compliance_documents.subject_type is
  'Generated: driver, truck or trailer. Derived, never written.';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  type public.customer_type not null default 'broker',
  mc_number text,
  billing_email text check (billing_email is null or position('@' in billing_email) > 1),
  payment_terms_days integer not null default 30
    check (payment_terms_days between 0 and 180),
  send_mode public.invoice_send_mode not null default 'email',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);

create index customers_company_name_idx on public.customers (company_id, name);

create trigger customers_touch_updated_at
  before update on public.customers
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.customers is
  'A broker or shipper. Archived, never deleted.';
comment on column public.customers.payment_terms_days is
  'Net terms. Phase 5 computes an invoice due_on from it; nothing stores '
  '"overdue".';
comment on column public.customers.send_mode is
  'email: v2 sends the invoice. own_portal: the office uploads it themselves.';

-- ---------------------------------------------------------------------------
-- customer_contacts
-- ---------------------------------------------------------------------------
create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null,
  name text not null check (length(btrim(name)) > 0),
  email text check (email is null or position('@' in email) > 1),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, customer_id)
    references public.customers (company_id, id) on delete cascade
);

create index customer_contacts_company_customer_idx
  on public.customer_contacts (company_id, customer_id);

create trigger customer_contacts_touch_updated_at
  before update on public.customer_contacts
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.customer_contacts is 'A person at a customer.';

-- ---------------------------------------------------------------------------
-- facilities
-- ---------------------------------------------------------------------------
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  address text not null check (length(btrim(address)) > 0),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  -- A facility's own IANA zone: phase 3 stores appointment windows against it
  -- so an 08:00 appointment means 08:00 at the dock. Defaults to the carrier's
  -- zone and is confirmed in the form; the geocoder returns no time zone.
  timezone text not null default 'America/Chicago',
  detention_free_minutes integer not null default 120
    check (detention_free_minutes between 0 and 1440),
  notes text,
  geocode_status public.geocode_status not null default 'pending',
  geocoded_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  -- Coordinates come in pairs or not at all.
  constraint facilities_coords_together
    check ((lat is null) = (lng is null))
);

create index facilities_company_name_idx on public.facilities (company_id, name);
create index facilities_company_geocode_idx on public.facilities (company_id, geocode_status);

create trigger facilities_touch_updated_at
  before update on public.facilities
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.facilities is
  'A place freight moves through, reused across loads. Geocoded once by a '
  'worker job, then left alone (CLAUDE.md rule 5).';
comment on column public.facilities.geocode_status is
  'pending: queued. found: from the US Census geocoder. not_found: the '
  'geocoder missed. manual: someone placed the pin by hand, so no job will '
  'overwrite it.';

-- ---------------------------------------------------------------------------
-- import_mappings
-- ---------------------------------------------------------------------------
-- Not one of the spec's 37 tables: the spreadsheet import has to remember
-- "the company's column choices" (docs/build-plan.md, phase 2 step 5), and
-- they need somewhere to live. One row per company per kind of import.
create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind public.import_kind not null,
  -- { "Unit #": "unit_number", "VIN": "vin" }: the heading in their
  -- spreadsheet mapped to the field it fills.
  columns jsonb not null default '{}'::jsonb,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, kind)
);

create index import_mappings_company_idx on public.import_mappings (company_id, kind);

create trigger import_mappings_touch_updated_at
  before update on public.import_mappings
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.import_mappings is
  'What each company called each column last time they imported a spreadsheet.';

-- ---------------------------------------------------------------------------
-- fmcsa_carriers — global, not tenant-scoped
-- ---------------------------------------------------------------------------
-- FMCSA's public Company Census File, refreshed daily by a worker job. It is
-- the same federal data for everyone, so it carries no company_id and every
-- signed-in user may read it. Only the worker (service role) writes.
create table public.fmcsa_carriers (
  dot_number text primary key check (length(btrim(dot_number)) > 0),
  legal_name text not null,
  dba_name text,
  street text,
  city text,
  state text,
  zip text,
  -- The census file may not carry docket (MC) numbers; when it does not this
  -- stays null and the signup form asks for it.
  mc_number text,
  entity_type text,
  operating_status text,
  refreshed_at timestamptz not null default now()
);

create index fmcsa_carriers_legal_name_idx on public.fmcsa_carriers (lower(legal_name));

alter table public.fmcsa_carriers enable row level security;
revoke all on table public.fmcsa_carriers from anon, authenticated;
grant select on table public.fmcsa_carriers to authenticated;

create policy fmcsa_carriers_read on public.fmcsa_carriers
  for select to authenticated
  using (true);

comment on table public.fmcsa_carriers is
  'FMCSA Company Census File, imported daily. Public data: readable by any '
  'signed-in user, written only by the worker.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
select public.tm_apply_tenant_rls('drivers', 'select,insert,update');
select public.tm_apply_tenant_rls('trucks', 'select,insert,update');
select public.tm_apply_tenant_rls('trailers', 'select,insert,update');
select public.tm_apply_tenant_rls('customers', 'select,insert,update');
select public.tm_apply_tenant_rls('facilities', 'select,insert,update');
select public.tm_apply_tenant_rls('customer_contacts');
select public.tm_apply_tenant_rls('compliance_documents');
select public.tm_apply_tenant_rls('import_mappings');

-- auth_company_ids() covers office roles only, so a driver sees none of the
-- above by default. These two policies are the whole of what a driver reaches
-- here: their own row, and their own expiring paperwork — which is what the
-- compliance.expiring rule alerts them about.
create policy drivers_read_own on public.drivers
  for select to authenticated
  using (id in (select public.auth_driver_ids()));

create policy compliance_documents_read_own on public.compliance_documents
  for select to authenticated
  using (driver_id in (select public.auth_driver_ids()));
