-- Phase 1 — who the session is, and the policies built on top of it.
--
-- docs/spec/architecture.md, Data access rules:
--   * one helper, auth_company_ids(), returns the companies the session may act in
--   * no function callable by a user takes a company_id argument
--   * drivers get a narrower policy than the office
--
-- auth_company_ids() deliberately returns OFFICE memberships only (owner,
-- dispatcher, accounting). That makes the uniform tenant policy safe by
-- default: a table added in a later phase is invisible to drivers until
-- someone writes an explicit driver policy for it. Drivers reach their own
-- loads, documents and settlements through those narrow policies, never
-- through the company-wide one.

create or replace function public.auth_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.users u where u.auth_id = auth.uid();
$$;

comment on function public.auth_user_id() is
  'public.users.id of the signed-in session, or null.';

create or replace function public.auth_member_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id
  from public.memberships m
  join public.users u on u.id = m.user_id
  where u.auth_id = auth.uid()
    and m.status = 'active';
$$;

comment on function public.auth_member_company_ids() is
  'Every company the session is an active member of, drivers included. Used '
  'only where a driver legitimately needs company-level data (its own company '
  'row, its colleagues'' names).';

create or replace function public.auth_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id
  from public.memberships m
  join public.users u on u.id = m.user_id
  where u.auth_id = auth.uid()
    and m.status = 'active'
    and m.role in ('owner', 'dispatcher', 'accounting');
$$;

comment on function public.auth_company_ids() is
  'The companies this session may act in from the office app. The uniform '
  'tenant RLS policy is: company_id in (select auth_company_ids()).';

create or replace function public.auth_driver_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.driver_id
  from public.memberships m
  join public.users u on u.id = m.user_id
  where u.auth_id = auth.uid()
    and m.status = 'active'
    and m.role = 'driver'
    and m.driver_id is not null;
$$;

comment on function public.auth_driver_ids() is
  'The driver rows this session is. Narrow driver policies key off this, so no '
  'policy ever needs a company_id argument.';

grant execute on function public.auth_user_id() to authenticated;
grant execute on function public.auth_member_company_ids() to authenticated;
grant execute on function public.auth_company_ids() to authenticated;
grant execute on function public.auth_driver_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- users: not tenant-scoped, so it gets its own policies.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant select, update on table public.users to authenticated;

create policy users_read_self on public.users
  for select to authenticated
  using (auth_id = auth.uid());

-- The office needs colleagues' names on rows ("assigned by", "approved by").
create policy users_read_colleagues on public.users
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = users.id
        and m.company_id in (select public.auth_member_company_ids())
    )
  );

create policy users_update_self on public.users
  for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- ---------------------------------------------------------------------------
-- The tenant tables from the previous migration.
-- ---------------------------------------------------------------------------
-- No insert: a company is created only through tm_create_company_with_owner(),
-- and no delete: companies are archived.
select public.tm_apply_tenant_rls('companies', 'select,update');

-- A driver may read the company it works for (name, time zone), nothing more.
create policy company_read_as_member on public.companies
  for select to authenticated
  using (id in (select public.auth_member_company_ids()));

select public.tm_apply_tenant_rls('memberships', 'select,insert,update');

-- A driver may read its own membership (that is how the app learns its role).
create policy membership_read_own on public.memberships
  for select to authenticated
  using (user_id = public.auth_user_id());

select public.tm_apply_tenant_rls('invitations', 'select,insert,update');

-- Read-only: plan, truck limit and AI quota are never set from the browser.
select public.tm_apply_tenant_rls('subscriptions', 'select');
