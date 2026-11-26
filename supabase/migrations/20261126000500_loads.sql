-- Phase 3a — the load: the thing everything else in TruckMates is about.
--
-- docs/spec/spec.md, Data model (Loads and Documents groups) and State
-- machines. docs/build-plan.md, phase 3 step 1.
--
-- Every table here is tenant-scoped and declared so with tm_apply_tenant_rls(),
-- which refuses a table that lacks a NOT NULL company_id, an index led by it,
-- or a unique (company_id, id). The isolation sweep in tests/rls picks them up
-- on its own.
--
-- Two things the spec is firm about and this migration enforces:
--   * money is integer cents, never a float;
--   * whether a load is billed, paid or settled is NOT stored here. It is read
--     from invoices and settlement lines (CLAUDE.md rule 3), so there is no
--     such column to go stale.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.load_status as enum (
  'draft', 'booked', 'dispatched', 'in_transit', 'delivered', 'cancelled'
);

create type public.load_source as enum ('rate_con', 'manual');

create type public.stop_type as enum ('pickup', 'delivery');

create type public.charge_kind as enum (
  'linehaul', 'fuel_surcharge', 'detention', 'lumper', 'layover', 'tonu', 'other'
);

create type public.document_kind as enum ('rate_con', 'bol', 'pod', 'receipt', 'lumper');

create type public.extraction_status as enum (
  'uploaded', 'extracting', 'needs_review', 'confirmed', 'failed'
);

-- ---------------------------------------------------------------------------
-- loads
-- ---------------------------------------------------------------------------
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Human-readable, from number_sequences, per company (CLAUDE.md rule 2).
  load_number text not null check (length(btrim(load_number)) > 0),
  status public.load_status not null default 'draft',
  source public.load_source not null default 'manual',

  customer_id uuid,
  -- The broker's own number for this load. Two rate cons with the same one
  -- are almost certainly the same load, which is what the duplicate warning
  -- in docs/spec/flows.md looks at.
  broker_ref text,

  driver_id uuid,
  truck_id uuid,
  trailer_id uuid,

  -- Typed in until the routing server arrives in phase 7. The columns do not
  -- change when it does (docs/spec/architecture.md, Maps and routing).
  total_miles integer check (total_miles is null or total_miles >= 0),
  empty_miles integer check (empty_miles is null or empty_miles >= 0),

  notes text,
  cancelled_reason text,

  booked_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  unique (company_id, load_number),

  foreign key (company_id, customer_id) references public.customers (company_id, id),
  foreign key (company_id, driver_id) references public.drivers (company_id, id),
  foreign key (company_id, truck_id) references public.trucks (company_id, id),
  foreign key (company_id, trailer_id) references public.trailers (company_id, id),

  -- A load is dispatched when it has someone to drive it. The state machine in
  -- src/domain/load.ts refuses the transition; this makes the database refuse
  -- it too, so no other path can leave a dispatched load with nobody on it.
  constraint loads_dispatched_has_a_driver check (
    status not in ('dispatched', 'in_transit', 'delivered')
    or (driver_id is not null and truck_id is not null)
  )
);

create index loads_company_status_idx on public.loads (company_id, status);
create index loads_company_created_idx on public.loads (company_id, created_at desc);
create index loads_company_driver_idx on public.loads (company_id, driver_id)
  where driver_id is not null;
create index loads_company_customer_idx on public.loads (company_id, customer_id)
  where customer_id is not null;
create index loads_broker_ref_idx on public.loads (company_id, upper(btrim(broker_ref)))
  where broker_ref is not null;

create trigger loads_touch_updated_at
  before update on public.loads
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.loads is
  'A paid haul. Operational status only: whether it is billed, paid or settled '
  'is read from invoices and settlement lines, never stored here.';
comment on column public.loads.total_miles is
  'Typed in until phase 7 gives the worker a routing server.';

-- ---------------------------------------------------------------------------
-- load_stops
-- ---------------------------------------------------------------------------
create table public.load_stops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  load_id uuid not null,
  seq integer not null check (seq > 0),
  type public.stop_type not null,
  facility_id uuid,

  -- The appointment window, with the facility's zone beside it. An 08:00
  -- appointment means 08:00 at that dock, and the zone is stored rather than
  -- looked up later so that moving a facility never rewrites history.
  appt_start timestamptz,
  appt_end timestamptz,
  timezone text not null default 'America/Chicago',

  arrived_at timestamptz,
  departed_at timestamptz,

  reference text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  unique (company_id, load_id, seq),

  foreign key (company_id, load_id) references public.loads (company_id, id) on delete cascade,
  foreign key (company_id, facility_id) references public.facilities (company_id, id),

  constraint load_stops_window_in_order check (
    appt_start is null or appt_end is null or appt_end >= appt_start
  ),
  constraint load_stops_left_after_arriving check (
    arrived_at is null or departed_at is null or departed_at >= arrived_at
  )
);

create index load_stops_company_load_idx on public.load_stops (company_id, load_id, seq);
create index load_stops_company_facility_idx on public.load_stops (company_id, facility_id)
  where facility_id is not null;

create trigger load_stops_touch_updated_at
  before update on public.load_stops
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.load_stops is
  'Ordered pickups and deliveries. Detention is worked out from arrived_at, '
  'departed_at and the facility''s free time.';

-- ---------------------------------------------------------------------------
-- load_charges
-- ---------------------------------------------------------------------------
create table public.load_charges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  load_id uuid not null,
  kind public.charge_kind not null,
  description text,
  -- Integer cents (CLAUDE.md rule 2). Negative is allowed: a deduction a
  -- broker takes off the rate is a charge like any other.
  amount_cents integer not null,
  -- The same line can be billed to the customer, paid to the driver, both or
  -- neither; a lumper reimbursed by the broker and paid to the driver is both.
  bill_customer boolean not null default true,
  pay_driver boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  foreign key (company_id, load_id) references public.loads (company_id, id) on delete cascade
);

create index load_charges_company_load_idx on public.load_charges (company_id, load_id);

create trigger load_charges_touch_updated_at
  before update on public.load_charges
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.load_charges is
  'What a load earns or pays, in integer cents. The rate is the sum of the '
  'lines marked bill_customer; there is no separate rate column to disagree '
  'with them.';

-- ---------------------------------------------------------------------------
-- load_state_miles
-- ---------------------------------------------------------------------------
create table public.load_state_miles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  load_id uuid not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  miles integer not null check (miles >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  unique (company_id, load_id, state),
  foreign key (company_id, load_id) references public.loads (company_id, id) on delete cascade
);

create index load_state_miles_company_load_idx on public.load_state_miles (company_id, load_id);

create trigger load_state_miles_touch_updated_at
  before update on public.load_state_miles
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.load_state_miles is
  'Miles per state, for IFTA in phase 7. Typed in until the routing server '
  'can split a route by state boundaries.';

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  file_id uuid not null,
  kind public.document_kind not null,
  load_id uuid,
  stop_id uuid,

  extraction_status public.extraction_status not null default 'uploaded',
  -- What the model returned, kept beside the document so any extracted value
  -- can be traced back to it (docs/spec/architecture.md, AI document
  -- pipeline). Never shown to anyone as fact.
  extracted jsonb,
  extraction_error text,
  extracted_at timestamptz,
  -- Which model read it, so a change in accuracy can be traced to a change in
  -- model rather than guessed at.
  extracted_by text,

  uploaded_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  foreign key (company_id, file_id) references public.files (company_id, id) on delete cascade,
  foreign key (company_id, load_id) references public.loads (company_id, id) on delete set null,
  foreign key (company_id, stop_id) references public.load_stops (company_id, id) on delete set null
);

create index documents_company_load_idx on public.documents (company_id, load_id)
  where load_id is not null;
create index documents_company_status_idx on public.documents (company_id, extraction_status);
create index documents_company_kind_idx on public.documents (company_id, kind, created_at desc);

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.documents is
  'A typed document on top of a stored file: a rate con, a BOL, a POD, a '
  'receipt. Reading it with AI is phase 3b; the row exists from the upload.';

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Loads are not master data and not a financial record: a draft typed by
-- mistake should be removable. Once a load has been invoiced phase 5 will
-- stop that; until invoices exist there is nothing to protect.
select public.tm_apply_tenant_rls('loads');
select public.tm_apply_tenant_rls('load_stops');
select public.tm_apply_tenant_rls('load_charges');
select public.tm_apply_tenant_rls('load_state_miles');
select public.tm_apply_tenant_rls('documents');

-- A driver sees its own loads and nothing else (CLAUDE.md rule 1). The driver
-- app is phase 4; the policies exist now so that nothing has to be remembered
-- later, and so the RLS tests cover them from the start.
create policy loads_read_own on public.loads
  for select to authenticated
  using (driver_id in (select public.auth_driver_ids()));

create policy load_stops_read_own on public.load_stops
  for select to authenticated
  using (
    load_id in (
      select l.id from public.loads l where l.driver_id in (select public.auth_driver_ids())
    )
  );

create policy documents_read_own_load on public.documents
  for select to authenticated
  using (
    load_id in (
      select l.id from public.loads l where l.driver_id in (select public.auth_driver_ids())
    )
  );
