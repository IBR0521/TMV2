-- Phase 3a — a booked load asks for a driver.
--
-- docs/spec/spec.md, Event catalog: load.booked fires when a draft load is
-- confirmed, and the worker ranks the available drivers and trucks and
-- suggests the top one.
--
-- It reuses the phase 1 helper, which writes the events row and queues the
-- worker job in the same transaction as the change. The WHEN clause is what
-- keeps it honest: the event fires on the transition into booked, not on
-- every save of a load that happens to be booked already, and not when a
-- dispatched load is unassigned back to booked — that one is a dispatcher
-- taking somebody off on purpose, and suggesting the same person again would
-- be insubordinate.

create trigger loads_emit_booked
  after update of status on public.loads
  for each row
  when (
    new.status = 'booked'
    and old.status = 'draft'
  )
  execute function public.tm_tg_emit_event('load.booked', 'load');

comment on trigger loads_emit_booked on public.loads is
  'draft -> booked only. Unassigning a dispatched load back to booked is not '
  'a request for another suggestion.';
