-- Phase 2 — asking for a facility to be put on the map.
--
-- docs/build-plan.md, phase 2 step 6: "when a facility is saved, a worker job
-- geocodes it with the US Census geocoder and stores lat/lng".
--
-- This is not an automation rule: there is no mode to set and nothing for the
-- office to accept or dismiss, so it does not go through events and
-- suggestions. It is a background task the app always does, queued the moment
-- a facility needs it.
--
-- The job takes no payload and sweeps every pending facility, so:
--   * a job key coalesces a burst of saves (a spreadsheet import, say) into
--     one run rather than one job per row;
--   * a facility saved while the worker was down is still picked up, because
--     the same task also runs on a schedule.

create or replace function public.tm_tg_queue_geocode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.geocode_status <> 'pending' then
    return new;
  end if;

  -- The queue lives in the graphile_worker schema, which the worker installs.
  -- Without it the row simply stays pending until the scheduled run.
  if to_regproc('graphile_worker.add_job') is not null then
    execute 'select graphile_worker.add_job($1, $2::json, null, null, null, $3)'
      using 'geocode_facilities', '{}', 'geocode_facilities';
  end if;

  return new;
end;
$$;

comment on function public.tm_tg_queue_geocode() is
  'Asks the worker to place any facility waiting for coordinates. One job for '
  'all of them, coalesced on a job key.';

revoke all on function public.tm_tg_queue_geocode() from public;

create trigger facilities_queue_geocode
  after insert or update of geocode_status, address on public.facilities
  for each row execute function public.tm_tg_queue_geocode();
