-- Phase 1 — the two moments a person crosses a tenant boundary.
--
-- Signup and accepting an invitation are the only writes that cannot run under
-- the uniform policy: at that instant the person is not yet a member of the
-- company, so RLS correctly refuses them. Both run in a SECURITY DEFINER
-- function that acts for auth.uid() and nobody else, and neither takes a
-- company_id argument (docs/spec/architecture.md, Data access rules).

-- ---------------------------------------------------------------------------
-- auth.users -> public.users
-- ---------------------------------------------------------------------------
create or replace function public.tm_tg_sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (auth_id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (auth_id) do update
    set email = excluded.email,
        name = coalesce(nullif(users.name, ''), excluded.name),
        updated_at = now();
  return new;
end;
$$;

comment on function public.tm_tg_sync_auth_user() is
  'Keeps one public.users profile per login.';

revoke all on function public.tm_tg_sync_auth_user() from public;

create trigger tm_sync_auth_user
  after insert or update of email on auth.users
  for each row execute function public.tm_tg_sync_auth_user();

-- ---------------------------------------------------------------------------
-- Signup: create the carrier and make this account its owner.
-- ---------------------------------------------------------------------------
create or replace function public.tm_create_company_with_owner(
  p_name text,
  p_mc_number text,
  p_dot_number text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.auth_user_id();
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'sign in before creating a company' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_name, ''))) = 0 then
    raise exception 'a company name is required' using errcode = '22023';
  end if;

  if not exists (select 1 from pg_timezone_names t where t.name = p_timezone) then
    raise exception '% is not an IANA time zone', p_timezone using errcode = '22023';
  end if;

  -- One company per account in v2. Joining another carrier happens by
  -- invitation, never by creating a second company here.
  if exists (
    select 1 from public.memberships m
    where m.user_id = v_user_id and m.status = 'active'
  ) then
    raise exception 'this account already belongs to a company' using errcode = '42501';
  end if;

  insert into public.companies (name, mc_number, dot_number, timezone)
  values (btrim(p_name), nullif(btrim(coalesce(p_mc_number, '')), ''),
          nullif(btrim(coalesce(p_dot_number, '')), ''), p_timezone)
  returning id into v_company_id;

  insert into public.memberships (company_id, user_id, role, status)
  values (v_company_id, v_user_id, 'owner', 'active');

  -- 14 days, no card (docs/spec/spec.md, Decisions). Paddle arrives in phase 8.
  insert into public.subscriptions (
    company_id, provider, plan, status, truck_limit, ai_quota, trial_ends_at
  )
  values (v_company_id, 'trial', 'starter', 'trialing', 5, 150, now() + interval '14 days');

  insert into public.number_sequences (company_id, name, next_value)
  values (v_company_id, 'load', 1000),
         (v_company_id, 'invoice', 1000),
         (v_company_id, 'settlement', 1000);

  insert into public.audit_log (
    company_id, actor_type, actor_id, action, subject_type, subject_id, after
  )
  values (
    v_company_id, 'user', v_user_id, 'company.created', 'company', v_company_id,
    jsonb_build_object('name', btrim(p_name), 'timezone', p_timezone)
  );

  return v_company_id;
end;
$$;

comment on function public.tm_create_company_with_owner(text, text, text, text) is
  'Signup. Creates the carrier, makes the signed-in account its owner, opens '
  'the 14-day trial and seeds its number sequences. Takes no company_id.';

revoke all on function public.tm_create_company_with_owner(text, text, text, text) from public;
grant execute on function public.tm_create_company_with_owner(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Accepting an invitation.
-- ---------------------------------------------------------------------------
create or replace function public.tm_accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.auth_user_id();
  v_email text;
  v_invitation public.invitations;
begin
  if v_user_id is null then
    raise exception 'sign in before accepting an invitation' using errcode = '42501';
  end if;

  select * into v_invitation
  from public.invitations i
  where i.token = p_token
    and i.status = 'pending'
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'this invitation has expired or was already used'
      using errcode = '42501';
  end if;

  select u.email into v_email from public.users u where u.id = v_user_id;

  -- The link is a secret, but it is a secret addressed to one mailbox.
  if lower(coalesce(v_email, '')) <> lower(v_invitation.email) then
    raise exception 'this invitation was sent to another email address'
      using errcode = '42501';
  end if;

  insert into public.memberships (company_id, user_id, role, status)
  values (v_invitation.company_id, v_user_id, v_invitation.role, 'active')
  on conflict (company_id, user_id) do update
    set role = excluded.role,
        status = 'active',
        updated_at = now();

  update public.invitations
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = v_user_id
  where id = v_invitation.id;

  insert into public.audit_log (
    company_id, actor_type, actor_id, action, subject_type, subject_id, after
  )
  values (
    v_invitation.company_id, 'user', v_user_id, 'membership.accepted',
    'membership', v_user_id,
    jsonb_build_object('role', v_invitation.role, 'invitation_id', v_invitation.id)
  );

  return v_invitation.company_id;
end;
$$;

comment on function public.tm_accept_invitation(text) is
  'Turns a valid invitation into a membership for the signed-in account. The '
  'account email must match the address the invitation was sent to.';

revoke all on function public.tm_accept_invitation(text) from public;
grant execute on function public.tm_accept_invitation(text) to authenticated;
