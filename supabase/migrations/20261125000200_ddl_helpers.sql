-- Phase 1 — the helper every tenant table is secured with.
--
-- CLAUDE.md, rule 1: every tenant table has company_id NOT NULL and an index,
-- RLS with one uniform policy, and composite (company_id, id) keys so a child
-- row can never point at another company's parent.
--
-- tm_apply_tenant_rls() is how a migration states "this is a tenant table".
-- It refuses to secure a table that breaks any of those rules, so a mistake
-- fails the migration instead of leaking rows later.

create or replace function public.tm_tg_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.tm_tg_touch_updated_at() is
  'BEFORE UPDATE trigger: keeps updated_at honest.';

create or replace function public.tm_apply_tenant_rls(
  p_table text,
  p_ops text default 'select,insert,update,delete'
)
returns void
language plpgsql
set search_path = ''
as $outer$
declare
  v_oid oid := format('public.%I', p_table)::regclass::oid;
  v_ops text[] := string_to_array(replace(p_ops, ' ', ''), ',');
  v_unknown text[];
begin
  v_unknown := array(
    select op from unnest(v_ops) as op
    where op not in ('select', 'insert', 'update', 'delete')
  );
  if array_length(v_unknown, 1) is not null then
    raise exception 'tm_apply_tenant_rls(%): unknown operation(s) %', p_table, v_unknown;
  end if;

  -- 1. company_id must exist and never be null.
  if not exists (
    select 1
    from pg_attribute a
    where a.attrelid = v_oid
      and a.attname = 'company_id'
      and a.attnum > 0
      and not a.attisdropped
      and a.attnotnull
  ) then
    raise exception
      'public.% is not a tenant table: it needs a NOT NULL company_id column', p_table;
  end if;

  -- 2. company_id must lead an index, or every tenant read is a sequential scan.
  if not exists (
    select 1
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = v_oid
      and a.attname = 'company_id'
  ) then
    raise exception
      'public.% needs an index whose first column is company_id', p_table;
  end if;

  -- 3. (company_id, id) must be unique, so child tables in later phases can
  --    hang composite foreign keys off it.
  if not exists (
    select 1
    from pg_index i
    where i.indrelid = v_oid
      and i.indisunique
      and i.indnkeyatts = 2
      and (select a.attname from pg_attribute a
            where a.attrelid = i.indrelid and a.attnum = i.indkey[0]) = 'company_id'
      and (select a.attname from pg_attribute a
            where a.attrelid = i.indrelid and a.attnum = i.indkey[1]) = 'id'
  ) then
    raise exception
      'public.% needs a unique (company_id, id) key for composite foreign keys', p_table;
  end if;

  execute format('alter table public.%I enable row level security', p_table);

  -- Supabase grants everything to anon and authenticated by default. Take it
  -- all back, then hand out only the operations this table actually allows.
  execute format('revoke all on table public.%I from anon, authenticated', p_table);
  execute format('grant %s on table public.%I to authenticated',
                 array_to_string(v_ops, ', '), p_table);

  if 'select' = any (v_ops) then
    execute format($p$
      create policy tenant_read on public.%I
        for select to authenticated
        using (company_id in (select public.auth_company_ids()))
    $p$, p_table);
  end if;

  if 'insert' = any (v_ops) then
    execute format($p$
      create policy tenant_insert on public.%I
        for insert to authenticated
        with check (company_id in (select public.auth_company_ids()))
    $p$, p_table);
  end if;

  if 'update' = any (v_ops) then
    execute format($p$
      create policy tenant_update on public.%I
        for update to authenticated
        using (company_id in (select public.auth_company_ids()))
        with check (company_id in (select public.auth_company_ids()))
    $p$, p_table);
  end if;

  if 'delete' = any (v_ops) then
    execute format($p$
      create policy tenant_delete on public.%I
        for delete to authenticated
        using (company_id in (select public.auth_company_ids()))
    $p$, p_table);
  end if;
end;
$outer$;

comment on function public.tm_apply_tenant_rls(text, text) is
  'Declares a table as tenant-scoped: checks company_id, its index and the '
  '(company_id, id) unique key, then applies the uniform RLS policy. '
  'Migration-time only; not callable by users.';

-- Nobody but a migration (running as the database owner) may call this.
revoke all on function public.tm_apply_tenant_rls(text, text) from public;
