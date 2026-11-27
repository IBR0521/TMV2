-- Phase 3a — where the truck is, and the moment it leaves a dock.
--
-- docs/build-plan.md, phase 3 step 7: check calls on the load, entered by the
-- office for now, and a rule that suggests a detention charge when dwell at a
-- stop exceeds the facility's free time.
--
-- `check_calls` is not one of the spec's 37 tables. A check call is
-- operational: where the truck was at a moment somebody asked. It is not an
-- audit entry — nobody changed anything — and it is not a stop, because most
-- check calls happen between them. It needs its own small table, and this
-- says so rather than bending one of the others.

create table public.check_calls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  load_id uuid not null,
  at timestamptz not null default now(),
  -- Free text on purpose: "on I-20 near Birmingham" is what a driver says on
  -- the phone, and forcing it into coordinates would lose it.
  location text not null check (length(btrim(location)) > 0),
  note text,
  /** Set from phase 4, when the driver app reports its own position. */
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  recorded_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, id),
  foreign key (company_id, load_id) references public.loads (company_id, id) on delete cascade,
  constraint check_calls_coords_together check ((lat is null) = (lng is null))
);

create index check_calls_company_load_idx on public.check_calls (company_id, load_id, at desc);

create trigger check_calls_touch_updated_at
  before update on public.check_calls
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.check_calls is
  'Where the truck was when somebody asked. Office-entered in phase 3; the '
  'driver app reports its own from phase 4.';

select public.tm_apply_tenant_rls('check_calls');

-- A driver reads the check calls on their own loads, like the rest of it.
create policy check_calls_read_own on public.check_calls
  for select to authenticated
  using (
    load_id in (
      select l.id from public.loads l where l.driver_id in (select public.auth_driver_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Leaving a stop
-- ---------------------------------------------------------------------------
-- docs/spec/spec.md, Event catalog — stop.departed: "Dwell over free time
-- becomes a detention charge. Suggest: add charge."
--
-- The event fires when a departure is first recorded, not every time the row
-- is touched afterwards: correcting a note on a stop that left yesterday is
-- not a fresh departure.

create trigger load_stops_emit_departed
  after update of departed_at on public.load_stops
  for each row
  when (new.departed_at is not null and old.departed_at is null)
  execute function public.tm_tg_emit_event('stop.departed', 'load_stop');

comment on trigger load_stops_emit_departed on public.load_stops is
  'First departure only. A later correction is not another departure.';
