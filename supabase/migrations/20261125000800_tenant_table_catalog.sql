-- Phase 1 — what makes "new tables are picked up automatically" true.
--
-- docs/spec/architecture.md, Data access rules: "An RLS test creates two
-- companies, then for every table with a company_id checks that company A
-- can't read, insert, update or delete company B's rows. New tables are picked
-- up automatically."
--
-- The test asks the database which tables those are rather than keeping its own
-- list, so a table added in a later phase is covered the moment it exists.

create or replace function public.tm_tenant_tables()
returns table (table_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'company_id'
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attnum > 0
    and not a.attisdropped
  order by c.relname;
$$;

comment on function public.tm_tenant_tables() is
  'Every table in public that carries a company_id. Used by tests/rls so that '
  'a table added later is swept without anyone remembering to add it.';

-- Not something a signed-in user needs; the RLS tests call it as service_role.
revoke all on function public.tm_tenant_tables() from public;
grant execute on function public.tm_tenant_tables() to service_role;
