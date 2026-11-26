-- Phase 1 — the automation pipe.
--
-- docs/spec/architecture.md, Automation engine:
--   1. a trigger writes an events row in the same transaction as the change
--   2. the same trigger queues a Graphile Worker job
--   3. the worker runs the rules for that event type in the company's mode
--   4. auto acts and writes audit_log; suggest upserts a suggestions row
--   5. accepting a suggestion calls the same service the manual screen calls
--
-- Phase 1 builds 1, 2 and the suggest half of 4, plus one test rule.

-- ---------------------------------------------------------------------------
-- events: the outbox. Written by triggers only.
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null,
  subject_type text not null,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  actor_type text not null default 'user' check (actor_type in ('user', 'automation', 'system')),
  actor_id uuid references public.users (id),
  occurred_at timestamptz not null default now(),
  processed_at timestamptz,
  -- False only if the worker's job queue was not installed yet; the worker
  -- picks such events up on its next sweep.
  job_queued boolean not null default false,
  unique (company_id, id)
);

create index events_company_id_idx on public.events (company_id, occurred_at desc);
create index events_unprocessed_idx on public.events (occurred_at) where processed_at is null;

comment on table public.events is
  'Every change that automation listens to. A change cannot happen without its '
  'event: both are written in one transaction.';

-- ---------------------------------------------------------------------------
-- suggestions: the Today inbox.
-- ---------------------------------------------------------------------------
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null,
  subject_type text,
  subject_id uuid,
  title text not null,
  detail text,
  payload jsonb not null default '{}'::jsonb,
  -- Accepting a suggestion calls this service action with these parameters,
  -- as the clicking user, so roles and RLS still apply.
  action_name text,
  action_params jsonb not null default '{}'::jsonb,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'dismissed', 'expired')),
  -- One open card per thing: a repeated event updates the card instead of
  -- stacking another one (CLAUDE.md rule 4).
  dedupe_key text not null,
  event_id uuid,
  resolved_at timestamptz,
  resolved_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, dedupe_key),
  constraint suggestions_resolved_together
    check ((status = 'open') = (resolved_at is null))
);

create index suggestions_company_id_idx on public.suggestions (company_id, status, created_at desc);

create trigger suggestions_touch_updated_at
  before update on public.suggestions
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.suggestions is
  'What the Today page shows. Upserted by the worker on (company_id, dedupe_key).';

-- ---------------------------------------------------------------------------
-- automation_settings: per-company mode for each rule.
-- ---------------------------------------------------------------------------
create table public.automation_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  rule_key text not null,
  mode text not null check (mode in ('auto', 'suggest', 'off')),
  updated_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, rule_key)
);

create index automation_settings_company_id_idx on public.automation_settings (company_id);

create trigger automation_settings_touch_updated_at
  before update on public.automation_settings
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.automation_settings is
  'A row exists only once a company changes a rule. Absent means the rule runs '
  'in the default mode declared beside it in worker/rules.';

-- ---------------------------------------------------------------------------
-- ai_usage: checked against the plan quota before every Claude API call.
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  month date not null check (month = date_trunc('month', month)::date),
  documents integer not null default 0 check (documents >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, month)
);

create index ai_usage_company_id_idx on public.ai_usage (company_id);

create trigger ai_usage_touch_updated_at
  before update on public.ai_usage
  for each row execute function public.tm_tg_touch_updated_at();

comment on table public.ai_usage is
  'Documents read per company per month. The worker checks it against '
  'subscriptions.ai_quota before calling the Claude API (CLAUDE.md rule 5).';

-- ---------------------------------------------------------------------------
-- automation_test_pings: phase 1 scaffolding.
-- ---------------------------------------------------------------------------
-- The only table in phase 1 whose change produces an event, so the whole pipe
-- (trigger -> events -> job -> rule -> suggestion -> Today) can be proven
-- before loads exist. Phase 3 replaces it with real load triggers.
create table public.automation_test_pings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  note text not null default '',
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);

create index automation_test_pings_company_id_idx on public.automation_test_pings (company_id);

comment on table public.automation_test_pings is
  'Phase 1 only: inserting a row exercises the trigger-to-suggestion pipe.';

-- ---------------------------------------------------------------------------
-- The trigger helper: one events row and one job, in the caller's transaction.
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because events is readable but never writable by a user;
-- it is revoked from everyone, so it can only ever run as a trigger.
create or replace function public.tm_tg_emit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_type text := tg_argv[0];
  v_subject_type text := tg_argv[1];
  v_event_id uuid := gen_random_uuid();
  v_queued boolean := false;
begin
  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  -- The job queue lives in the graphile_worker schema, which the worker
  -- installs. If it is not there yet the event is still recorded, and the
  -- worker queues it on its next sweep.
  if to_regproc('graphile_worker.add_job') is not null then
    execute 'select graphile_worker.add_job($1, $2::json)'
      using 'process_event',
            jsonb_build_object(
              'event_id', v_event_id,
              'company_id', v_row.company_id,
              'type', v_type
            )::text;
    v_queued := true;
  end if;

  insert into public.events (
    id, company_id, type, subject_type, subject_id, payload, actor_type, actor_id, job_queued
  )
  values (
    v_event_id,
    v_row.company_id,
    v_type,
    v_subject_type,
    v_row.id,
    to_jsonb(v_row) - 'company_id',
    case when public.auth_user_id() is null then 'system' else 'user' end,
    public.auth_user_id(),
    v_queued
  );

  return v_row;
end;
$$;

comment on function public.tm_tg_emit_event() is
  'Row trigger: writes the events row and queues its worker job in the same '
  'transaction as the change. Arguments: event type, subject type.';

revoke all on function public.tm_tg_emit_event() from public;

create trigger automation_test_pings_emit_event
  after insert on public.automation_test_pings
  for each row execute function public.tm_tg_emit_event('test.ping', 'automation_test_ping');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- events are written by triggers and read by the office; suggestions are
-- written by the worker and resolved by the office.
select public.tm_apply_tenant_rls('events', 'select');
select public.tm_apply_tenant_rls('suggestions', 'select,update');
select public.tm_apply_tenant_rls('automation_settings', 'select,insert,update');
select public.tm_apply_tenant_rls('ai_usage', 'select');
select public.tm_apply_tenant_rls('automation_test_pings', 'select,insert');

-- ---------------------------------------------------------------------------
-- Realtime: the Today page follows its own company's suggestions live.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.suggestions;
  end if;
end;
$$;

alter table public.suggestions replica identity full;
