-- Phase 1 — extensions.
--
-- PostGIS is enabled now, before any data exists, because load_state_miles
-- (phase 7) splits a route line by US state boundaries. Enabling it later on a
-- live database is a lock we would rather not take.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;

comment on schema extensions is
  'Supabase convention: extensions live here, never in public.';
