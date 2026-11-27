-- Phase 3a — the two numbers a profit estimate needs before phase 6.
--
-- docs/build-plan.md, phase 3 step 9: estimated profit is "revenue minus
-- driver pay estimate (a flat placeholder rate per mile in company settings
-- until phase 6) minus fuel estimate".
--
-- Two columns on companies rather than a settings table: they are one value
-- each, per carrier, and a table of two rows would be ceremony. Phase 6
-- replaces the driver figure with real pay profiles, and the column goes then.
--
-- Integer cents per mile, like all money here. The defaults are ordinary US
-- dry van figures in 2026 — about 60 cents a mile to the driver, and fuel at
-- roughly $3.50 a gallon over 6.5 miles per gallon. A carrier who leaves them
-- alone gets an estimate in the right part of the map; one who cares will
-- change them.

alter table public.companies
  add column driver_pay_cents_per_mile integer not null default 60
    check (driver_pay_cents_per_mile >= 0 and driver_pay_cents_per_mile <= 500),
  add column fuel_cents_per_mile integer not null default 54
    check (fuel_cents_per_mile >= 0 and fuel_cents_per_mile <= 500);

comment on column public.companies.driver_pay_cents_per_mile is
  'Placeholder for the profit estimate until phase 6 brings real pay profiles.';
comment on column public.companies.fuel_cents_per_mile is
  'Placeholder for the profit estimate until phase 7 brings real routing and '
  'fuel purchases.';
