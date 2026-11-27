# Progress

## Phase 3a — Loads and dispatch

**Status: everything 3a set out to do is built on branch `phase-3a-loads`.**
The owner approved the plan and the three-way split on 26 November 2026.
Nothing is pushed and there is no pull request yet.

### What is there

1. **Five tables** — loads, load_stops, load_charges, load_state_miles,
   documents — plus check_calls, which the spec's 37 do not include. The
   isolation sweep found them all on its own: 283 RLS tests, up from 226.
   Two things the schema enforces rather than trusting code: a load cannot be
   dispatched without a driver and a truck, and whether it is billed, paid or
   settled is not stored on it at all.
2. **The state machine** in `src/domain/load.ts`, with the whole six-by-six
   grid tested — thirty-six cases stated once, so no transition can be widened
   without the test file disagreeing. Refusals are specific: "A load needs a
   delivery before it can be booked".
3. **Services and actions.** A load number is one UPDATE ... RETURNING with a
   single retry, so two dispatchers get different numbers; a status move only
   lands if the load is still where it was read, so the second person to press
   Dispatch is told rather than ignored.
4. **The three screens** — Loads list, New load, Load page with its tabs,
   stops, money and timeline — from the approved preview in `src/ui/previews`.
5. **The dispatch board**, derived entirely from loads and stops. There is no
   schedule table that could disagree with them.
6. **The dispatch suggestion.** Booking a load ranks the drivers who are free
   and suggests the closest, with the reason on the card. Accepting it assigns
   them; dispatching stays a person's decision.
7. **Check calls and detention.** Leaving a dock longer than it allows offers a
   detention line — the hours, not the figure, because no contract rate is on
   record. The event fires on the first departure only, so a correction does
   not raise a second card.
8. **Loads in search**, by number and by the broker's reference.
9. **The company screen**, owner only, holding the two placeholder rates every
   profit estimate leans on.

All green: typecheck, lint, UI guard (148 files), 270 unit and action tests,
283 RLS tests, 10 end-to-end, 4 visual, production build. The visual baselines
are untouched.

### Two bugs worth remembering

- **A composite `ON DELETE SET NULL` nulls every column in the key.** Deleting
  a load with a document attached failed outright, because company_id is NOT
  NULL. Postgres 15's column list fixes it; found by trying to clear demo data,
  not by a test.
- **An 08:00 Memphis pickup saved as 21:00 the previous day.** Three zones were
  in play — the browser's, the server's and the facility's — and
  `new Date("2026-11-30T08:00")` reads the string in whichever one the machine
  is set to. `src/domain/time.ts` now converts with the zone always named, and
  the action passes the wall clock through untouched because only the service
  knows which dock it belongs to.

### Three tables the spec's 37 do not include

`import_mappings` (phase 2), `check_calls` and nothing else. Each is noted
where it was added and why.

### What 3a does not do

Reading a rate confirmation (3b) and running in production (3c). The Load page
shows no Documents tab for that reason, and New load says plainly that
dropping a rate con is the next piece of work.

## Phase 2 — Fleet and customers

**Status: everything phase 2 asked for is built on branch `phase-2-fleet`,
except two things waiting on the owner (below). Nothing is pushed and there is
no pull request yet.**
The plan was approved on 26 November 2026. Nothing is pushed and there is no
pull request yet.

### Done

1. **Schema.** `drivers`, `trucks`, `trailers`, `compliance_documents`,
   `customers`, `customer_contacts`, `facilities`, `import_mappings`, and the
   global `fmcsa_carriers`. All applied from an empty database. The isolation
   sweep found the eight tenant tables on its own: 210 RLS tests, up from 129.
   The driver policies are tested rather than assumed — the fixture now ties a
   driver login to a driver row, so a driver provably reads its own row and its
   own paperwork, cannot change that paperwork, and sees nothing in the other
   six tables.
2. **Domain rules.** `src/domain/fleet.ts`, `customers.ts` and
   `spreadsheet.ts`: expiry, labels, the tidying of VIN, phone, MC and email,
   and the column matching the import needs. 58 new tests.
3. **Services and actions.** `services/fleet.ts`, `customers.ts` and
   `facilities.ts`, each taking ctx; `actions/fleet.ts`, `customers.ts` and
   `facilities.ts`, thin wrappers whose schemas carry no company_id. The truck
   limit lives in `src/domain/plan.ts` so it can be tested without a database:
   no limit during the trial, an already-active truck does not count twice.
4. **All seven screens**, from the patterns in design/KIT.md, assembled only
   from `@/ui`: Drivers, the driver page, trucks and trailers in one list with
   a toggle, the unit page, Customers, the customer page with its contacts,
   and Facilities with the facility page. One compliance panel serves drivers,
   trucks and trailers; one form each serves new and edit. Seeded demo fleet
   and customer list for both carriers, with paperwork dated relative to the
   day the seed runs so the expiry chips are alive.

All green: typecheck, lint, UI guard (132 files), 169 unit and action tests,
226 RLS tests, 10 end-to-end, 4 visual, production build. The visual baselines
are untouched.

5. **The expiring paperwork rule.** A card on Today 30 days before a CDL,
   medical card, registration, insurance or inspection expires, and a second
   at 7. The daily job raises an `events` row like any trigger, so the card is
   produced by the same pipe; the rule itself is pure. The dedupe key carries
   the threshold, and a document whose card already exists in any state is
   skipped, so each window is raised once and a dismissed card does not come
   back. Today is read in each carrier's own zone.

   Checked against the real stack: the job raised exactly the five cards the
   seeded paperwork deserves and none for the carrier with nothing due; a
   second run with one card dismissed added no events and no cards.

### What the screens deliberately do not show

- **The customer scorecard** (pay speed, detention history) is read from
  invoices and loads, so it waits for phases 3 and 5 — and "New load", the
  primary action the spec gives the customer page, waits with it.
- **The facility map.** A chip and the coordinates, not a map: the pin that
  corrects a bad geocode is a later step and the basemap is still undecided.
  A map that cannot be corrected would be worse than none.
- **Which truck a driver is driving.** We know which truck they *own*;
  assignment arrives with loads in phase 3, so the column says "Truck owned".

### Two deliberate departures from the spec

- **`compliance_documents` has no polymorphic `subject_id`.** The spec
  describes subject_type plus subject_id; a polymorphic key can carry no
  foreign key, and CLAUDE.md rule 1 requires composite keys between tenant
  tables. So the subject is three nullable keys with "exactly one" enforced,
  and `subject_type` and `subject_id` are generated from them. Reads look as
  the spec says; a document cannot point at a row that does not exist.
- **`import_mappings` is a table the spec's 37 do not include.** The import has
  to remember each company's column choices and they need somewhere to live.

### Defect found and fixed

The worker's health endpoint went on answering "ok" after Graphile Worker had
shut itself down over a schema change, so Playwright reused a worker that was
never going to run a job and an end-to-end test failed for the wrong reason.
It now answers 503 once the runner stops, and the process exits non-zero
rather than lingering as something that answers requests but does no work.

6. **Geocoding.** Saving a facility queues a worker job that looks the address
   up with the US Census geocoder and stores the coordinates. A trigger queues
   it; a job key coalesces a burst of saves into one run; a quarter-hourly
   schedule catches rows saved while the worker was down. It never overwrites
   a pin placed by hand, never looks up an address it has already resolved,
   and never marks an address "not found" because the network failed.
   Checked against the real geocoder: a facility whose address changed was
   re-queued and placed at 35.0396, -89.9223.

7. **The DOT number lookup.** Typing a USDOT number at signup and moving on
   fills the carrier name from FMCSA's public data, with the address shown
   underneath as proof it is the right carrier. Live rather than mirrored (see
   below). It never overwrites a name already typed, and every failure falls
   back to the manual form. Checked in the browser against the real service.

8. **The spreadsheet import.** Trucks, drivers and customers from a carrier's
   own export, with column matching, a preview and the company's choices
   remembered. The file is read in the browser and never uploaded; the server
   re-reads the cells with the same pure functions the preview used, so the
   preview is honest and the server is still the authority. Nothing is ever
   updated: a row already on the list is skipped and said so. A sheet that
   would pass the plan's truck limit is refused whole.

   `src/domain/csv.ts` is written rather than installed — quoted fields,
   doubled quotes, the byte-order mark, CRLF — with fifteen tests.
   `read-excel-file` (MIT, current, no advisories) reads .xlsx and is loaded
   only when somebody opens one.

   Checked in the browser with a 21-row export: 19 added, 1 already on the
   list, 1 rejected for a short VIN, flagged on its own line beforehand.

   **Rough edge:** the preview marks a row "Ready" even when that unit number
   is already on the list; only the result afterwards says it was skipped. The
   preview would have to read the existing list to know. Worth doing if it
   bothers anyone.

9. **Uploads.** A private `documents` bucket, isolated the way the tables are:
   every object's path begins with the company id and the storage policies
   only let a session touch its own company's folder. Ten new tests prove it —
   cross-tenant write, read, list, delete and signed link all refused, drivers
   locked out until phase 4, and a path that is not a company id refused
   rather than raising.

   The browser asks where to put a file, uploads there, then asks for the row,
   so it never chooses its own path and the object is named with a uuid rather
   than the carrier's own file name. Removing a document takes the compliance
   row, the file row and the stored object together — checked end to end in
   the browser. `files` became deletable to allow that; phase 1 had not
   anticipated uploads.

10. **The setup wizard.** Carrier, fleet, customers, team — every step after
    the carrier skippable, the steps reusing the same importer and invite form
    Settings uses. Today keeps the checklist, worked out from what is actually
    in the company rather than a flag, so it disappears as the carrier fills
    it in and never has to be dismissed.
11. **Global search.** Drivers, trucks, trailers, customers and facilities,
    scoped by company and proved so by six tests — including two carriers with
    a driver of the same name. What a carrier types is text, not a pattern:
    "%%" finds nothing. The box in all fourteen page headers submits to it,
    and the results page shows the same box with what was typed still in it.

### Phase 2 "done when", line by line

- **A sample CSV of 20 trucks and 20 drivers imports in under 15 minutes from
  a fresh signup, including the setup wizard.** Done, and covered by
  `tests/e2e/import-a-fleet.spec.ts`: signup, carrier, both imports and both
  fleet screens, in about two seconds of machine time.
- **A DOT number from the census file fills the company form.** Done, live
  rather than mirrored.
- **A facility saved with an address shows on the map at the right place.**
  Half done: it is geocoded and placed, and checked against the real service.
  There is no map yet — that waits on the basemap decision.
- **Documents expiring in 30 and 7 days produce one suggestion each, never
  duplicates.** Done, and checked against the real stack twice over.
- **RLS tests cover every new table.** Done; the sweep picks them up on its
  own, and storage and search have tests of their own.
- **Playwright covers the setup wizard.** Done, three tests.

### Something missing that nobody has asked for yet

**There is no way to sign out.** Phase 1 built sign-in and never built its
opposite, and the kit's sidebar has no slot for it — the footer takes a
company name and a plan label and nothing else. So this needs both a decision
and, probably, a change to `src/ui`, which rule 7 says is the owner's to make.
Worth doing before anyone outside this laptop sees the app.

### What the FMCSA census file actually contains

Checked on 26 November 2026 against the dataset itself
(data.transportation.gov, `az4n-8mr2`):

- **4,535,564 rows**, of which **2,248,264 are active** carriers.
- Columns include `dot_number`, `legal_name`, `phy_street`, `phy_city`,
  `phy_state`, `phy_zip`, `status_code`.
- **There is no MC (docket) number in it.** The open question above is
  answered: a DOT lookup can fill the name and address, and the MC has to stay
  a typed field unless a second federal file is added, which would be a new
  dependency and needs the owner's approval.
- A single lookup by DOT number through the public Socrata API answers
  instantly and needs no key.

The owner chose on 26 November 2026 to look a DOT number up live rather than
mirror the file: one public request when somebody types a number, nothing to
store and nothing to keep fresh. **`fmcsa_carriers` is therefore unused.** It
is still in the schema; dropping a table is destructive, so it waits for the
owner's word.

### Two things the kit did not have

1. **A form-level error line.** A field error has `Field error=`, but a problem
   about the whole form — "Your plan covers 5 active trucks" — has nowhere of
   its own. It is shown on the first field, which is what the phase 1 invite
   form does. The owner decided on 26 November 2026 to leave it.
2. **A search box that can be submitted.** `SearchField` took no name and no
   handler, so it could not be submitted. **Closed on 26 November 2026:** the
   owner asked me to make the change, so `SearchField` now takes an optional
   `action` and becomes a plain GET form when it is set. Without `action` it
   renders exactly as before — which the four visual tests confirm against the
   untouched baselines — so nothing that already used it changed.

### Next

Nothing in the phase 2 brief. What is left is the owner's: the basemap
decision for the facility pin, whether to drop the now-unused
`fmcsa_carriers` table, and whether to add a way to sign out. Then the pull
request, and phase 3. The owner decided on 26 November 2026 to leave the
form-level error as it is.

### Waiting on the owner

- **The basemap.** The facility map exists only so a pin can be dragged when
  geocoding misses. Protomaps' planet file is 100–130GB; their hosted tiles
  are free for non-commercial use and ask for sponsorship commercially. The
  recommendation is a US extract at a capped zoom served from Supabase
  Storage, measured before it is committed to; if it comes out too large, the
  pin waits for phase 7 and phase 2 confirms addresses as text. No paid tile
  service without asking.
- **The MC number.** The FMCSA census file may not carry docket numbers. If it
  does not, the DOT lookup fills name and address and the MC stays a typed
  field — a second federal data source would be a new dependency and needs
  approval.

## Phase 1 — Foundation

**Status: built, verified, CI green, waiting for the owner's merge.** Branch
`phase-1-foundation`, pull request IBR0521/TMV2#1. Every "done when" item is
true, the last one included: CI ran for the first time on 26 November 2026 and
both jobs passed. Typecheck, lint, the UI guard and the 43 unit and action
tests in 42s; migrations from an empty database, seed, 129 RLS tests, 4
end-to-end tests and 4 visual tests in 2m45s. Nothing of phase 2 has been
started.

### What is there

1. **Repo scaffold.** Next.js 16 (App Router) with TypeScript strict and
   `noUncheckedIndexedAccess`, pnpm, Tailwind 4 with `src/ui/tokens.css`
   generated from `design/tokens.json` by `pnpm tokens`, Geist and Geist Mono,
   ESLint with the boundary rules below, Vitest (domain, actions, rls),
   Playwright, Sentry, and GitHub Actions running typecheck, lint, all four test
   layers and the migrations against an empty database.
2. **Supabase locally.** `supabase/config.toml` from the CLI; PostGIS enabled in
   the first migration, before any data exists.
3. **Migrations** (8 files): companies, users, memberships, invitations,
   subscriptions, audit_log, number_sequences, files, events, suggestions,
   automation_settings, ai_usage, plus `automation_test_pings` (phase 1
   scaffolding). `auth_company_ids()` and friends; RLS on every tenant table
   through one helper that refuses to secure a table missing `company_id`, its
   index or its `(company_id, id)` unique key.
4. **`src/server/context.ts`** (session → `{ userId, companyId, role }`) and the
   **`action(schema, roles, handler)`** wrapper, which refuses at load time to
   build an action whose input schema carries a company id.
5. **Auth.** Email and password signup, login, password reset. Signup creates
   the carrier (name, MC, DOT, time zone), makes the account its owner and opens
   a 14-day trial.
6. **Team.** Invite by email with a role; the link is shown and copyable for
   every role, including drivers. No SMS anywhere.
7. **Office shell** in the approved style: the 220px sidebar, role-filtered menu
   (owner 9, dispatcher 5, accounting 8, Settings on its own), placeholder pages
   for every section, and the global search field (finds nothing yet).
8. **Today** renders open suggestions and follows them over Supabase Realtime.
9. **Worker** (`worker/`): Graphile Worker, the trigger helper that writes the
   events row and queues its job in one transaction, one test rule that turns a
   `test.ping` event into a suggestion, a scheduled sweep for events whose job
   was never queued, and a `/health` endpoint.
10. **Seed**: two demo carriers with a person in every role, created the way a
    real carrier is (signup, invite, accept) — `pnpm db:seed`.

### What has actually been proven

Everything below was run against the real local Supabase stack (PostgreSQL 17
with PostGIS, Auth, Storage, Realtime) on 26 November 2026.

| Check | Result |
| --- | --- |
| `pnpm typecheck` | passes |
| `pnpm lint` | passes, zero warnings |
| `pnpm test` (domain + actions) | 39 tests pass |
| `pnpm test:rls` | 129 tests pass |
| `pnpm e2e` | 4 tests pass |
| `pnpm build` | 27 routes compile |
| `pnpm db:reset` | all 8 migrations apply to an empty database |
| `pnpm db:seed` | two carriers, 8 people, created through signup and invitations |

What the RLS run covers: the 12 tables carrying a `company_id` — read, insert,
update and delete, in both directions between two carriers — judged by whether
the other carrier's data actually changed rather than by which error came back,
so an attempt that trips a not-null constraint before RLS sees it cannot pass
for proof. Plus the driver's narrower view, and a check that the committed
database types still match the database.

What the end-to-end run covers: an owner signs up, sets the carrier up and sees
9 sections; invites a dispatcher; the dispatcher accepts in a separate browser
and sees exactly 5, with `/billing` answering 404 rather than merely hiding a
link; a signed-out visitor is redirected to sign in; and one click on Today
becomes a card without the page reloading — trigger, events row, queued job,
worker rule, suggestion, Realtime, screen.

Before Docker was available the same schema was also checked against a scratch
PostgreSQL 16 cluster with a Supabase shim (41 policy probes). That harness has
served its purpose; the real stack covers it now.

The office shell, Today and Users and roles were opened in a browser at desktop
and phone width and match the approved style.

### Three defects the test run found

1. **The sign-in form put the password in the address bar.** `next dev` serves
   its own chunks only to hosts listed in `allowedDevOrigins`, and everything
   local here is `127.0.0.1`, so no page ever hydrated: React never took over,
   the submit button stayed a plain HTML submit button, and the browser sent the
   form as a GET — `/signup?...&password=...`. Fixed three ways: the origin is
   allowed in `next.config.ts`; every form carries `method="post"`, so a submit
   that escapes the handler cannot put values in a URL; and every submit button
   waits for hydration (`src/ui/use-hydrated.ts`), which also stops someone
   pressing Enter into a dead form.
2. **`pnpm db:reset` and `pnpm db:seed` crashed.** Both scripts used top-level
   `await`, which tsx compiles as CommonJS here. Wrapped in `main()`.
3. **Users and roles had an overloaded header.** The invite form (three
   controls) sat beside the global search and wrapped into a jumble. It has its
   own panel now, and the header holds the title, subline and search, as the
   approved layout says.

### What is still not done

- **Nothing is deployed.** Everything runs on the owner's machine: the local
  Supabase stack, the dev server and the worker. There is no Supabase cloud
  project, no Vercel deployment and no public URL. Phase 1 does not ask for
  one, but nobody off this machine can look until there is.
- **Sentry** is wired and silent: no DSN yet.
- The PWA manifest ships an SVG icon only; proper PNG icons are still to come.

### The look was reworked on 26 November 2026

The owner rejected the v1 navy-and-blue system and the three layout variations
that followed it. What shipped instead, after reading how dark product software
is actually constructed:

- `design/tokens.json` is version 2. Depth is four surface steps (`bg`,
  `surface`, `surface-raised`, `selected`), hairlines are white at 7-16% rather
  than drawn grey, text runs in four tones (92/62/44/28%), and weight stops at
  500.
- Sodium amber is the one saturated colour: the next step on a screen and the
  active section, never decoration. Guide green and signal red are state only.
- Lists carry no dividers; a row lifts onto `surface-raised` under the pointer.
- Figures are mono and tabular throughout. Selection, focus rings and
  scrollbars are themed rather than left to the browser.
- `design/README.md` is rewritten around all of it, `CLAUDE.md` rule 7 now
  matches, and `docs/spec/approved-mockups.md` carries a note that its colour
  names describe the first draft while what each screen *shows* still stands.
- `/design/a|b|c|d` are development-only preview routes that carry the sample
  figures from the approved mockup. `d` is what shipped; the rest are kept only
  for comparison and should be deleted once nobody needs them.

Two local-stack problems surfaced while verifying and are fixed in
`supabase/config.toml`: the auth rate limit (30 sign-ins per 5 minutes) was
tripping intermittently because one full run of the suite signs in around thirty
times, and the Logflare analytics container times out its health check on
restart and is not used by anything here.

Still open from the rework: a phone has no navigation yet (the sidebar simply
hides below `md`), and Today has no summary figures or fleet column because
loads and trucks do not exist until phases 2 and 3 — the design preview shows
them with sample data, the real screen cannot.

### The application frame, 26 November 2026

Four attempts at the look all failed for the same reason: each one was a single
column with a list of six rows on it. That is a widget, not an application.
Dispatch work is a table you sort and select from, a view for the question you
are asking, a detail that opens beside the list, and a board you assign on.
None of that existed.

What is there now:

- **A real frame.** `src/ui/app-frame.tsx`: a top bar that belongs to the
  account (mark, carrier, global search with its shortcut, help, avatar), a
  216px rail that belongs to the carrier, and a workspace that belongs to the
  screen. On a desktop the frame is fixed and the workspace scrolls inside it;
  on a phone the page scrolls and the rail becomes a row.
- **Table primitives** (`src/ui/table.tsx`): sticky header, sortable columns
  with direction carets, checkbox selection, a selection bar that names what
  will happen to the rows, and figures that line up down the right.
- **A detail pane** (`src/ui/detail-panel.tsx`) that opens beside the list
  rather than replacing it, and covers the screen only on a phone.
- **Status pills, filter chips, saved-view tabs and a route strip** — the
  stops of a load as a line with progress, which answers "where is it and will
  it make the appointment" without needing the map that arrives in phase 7.
- **Loads** (`/loads`): twelve rows, five saved views with counts, a late
  filter, six sortable columns, selection with bulk actions, and the detail
  pane with route, assignment, money per mile, documents and timeline.
- **Dispatch** (`/dispatch`): the board — six trucks down the side, four days
  across, blocks spanning days in the state colours, a legend, and the loads
  with nobody on them in a rail beside it.

Loads and Dispatch carry the spec's own sample figures and say so in a notice
at the top of the screen, because phase 1 has no loads table. The structure,
the views, the sorting, the selection and the detail pane are real; phase 3
swaps the data underneath and the screens do not change.

### Decisions taken while building

1. **TypeScript 5.9.3, not 7.0.2.** 7.0.2 is the current stable, but
   `eslint-config-next@16.4.6` depends on `typescript-eslint@8`, whose peer range
   is `>=4.8.4 <6.1.0`. Lint matters more than the newest compiler here; revisit
   when typescript-eslint supports TypeScript 7.
2. **`auth_company_ids()` returns office memberships only** (owner, dispatcher,
   accounting). This is what makes the uniform tenant policy safe by default: a
   table added in a later phase is invisible to drivers until someone writes an
   explicit driver policy for it. Drivers reach their own company row, profile
   and membership through three narrow policies.
3. **Two SECURITY DEFINER functions**, `tm_create_company_with_owner()` and
   `tm_accept_invitation()`. At signup and at invite acceptance the account
   belongs to no company, so RLS correctly refuses a plain insert. Neither takes
   a `company_id`; both act only for `auth.uid()`.
4. **The generated database types are committed** (`pnpm db:types`), so the
   static CI job can typecheck without a database. `tests/rls/schema.test.ts`
   fails if a migration adds a table and nobody regenerated them.
5. **`automation_test_pings` and one `test.ping` rule** are phase 1 scaffolding:
   the only way to prove the automation pipe before loads exist. Phase 3 replaces
   them with the real load triggers and removes the table.
6. **The worker serves `/health`.** Its VPS will need it, and it is how
   Playwright knows the worker is up before the end-to-end tests run.
7. **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the convention and
   warns on the old name.
8. **A few packages are one release behind the newest.** pnpm's supply-chain
   policy on this machine rejects anything published in the last 24 hours, so
   `@sentry/nextjs` 11.17.0, `lucide-react` 1.79.0, `vitest` 5.1.1, `supabase`
   3.3.0, `@types/node` and `@types/react` are pinned one step back. Worth
   bumping at the start of phase 2.
9. **The service-role boundary is an allowlist**, not a blanket ban: `worker/`
   holds the key, and `scripts/` (the seed) and `tests/` (the RLS fixtures) need
   it to create two carriers. ESLint blocks it in `app/` and `src/`, and
   `tests/actions/service-role-boundary.test.ts` proves both halves — that lint
   really fails on such an import, and that the key appears in no other file.
10. **Today shows only the "Needs you" panel.** The summary strip and the Trucks
    panel in the approved mockup need loads and trucks, so they arrive with
    phases 2 and 3.
11. **`.claude/launch.json`** is a one-entry file so the app can be previewed in
    a browser pane with a single command. It changes nothing about the app.
12. **Invitations are links, as agreed**, for every role. Email delivery waits
    for Resend in phase 5. Icons are the kit's own: 19 line SVGs in
    `src/ui/icons.tsx`, stroke 1.8 on currentColor, no icon library installed.

### Open questions

None blocking. The repository exists, both branches are pushed, CI is green
and pull request 1 is open.

Two things are the owner's to decide, whenever they want them: whether to
stand up the cloud accounts in `docs/owner-setup.md` (Supabase, Vercel,
Sentry) so this can be opened from somewhere other than this laptop, and the
shape of phase 2 once the plan is on the table.

### Running it yourself

```
pnpm db:start      # the local Supabase stack (needs Docker running)
pnpm db:env        # writes .env.local from that stack
pnpm db:reset      # every migration from empty, plus the job queue schema
pnpm db:seed       # two demo carriers
pnpm dev           # http://127.0.0.1:3000
```

The demo accounts are listed in `scripts/seed.ts` — `owner@alpha.test` and the
rest, all with the password printed by the seed. Local development only.

To run the checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:rls`,
`pnpm e2e`.

Then the review list in `docs/owner-setup.md`. The owner gave the go-ahead for
phase 2 on 26 November 2026, conditional on this pull request being merged.
**The plan is shown and approved before any phase 2 code is written.**
