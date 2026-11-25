## PART 4 — Architecture

### System overview

v2 runs on three hosts: Vercel for the web app, Supabase for data, and one small Hetzner VPS for the worker (and, from phase 7, the routing server). The web app only ever touches data as the logged-in user; Postgres sits at the center; only the worker holds the service-role key.

- **Office app** (browser: dispatch, billing, pay) and **Driver app** (PWA on the phone, works offline) both talk to the **Next.js app on Vercel**: server actions → services → database with RLS on. The driver app syncs through `app/api/driver/sync`.
- **Supabase:** Postgres (RLS on every table, events table and Graphile Worker job queue, PostGIS for state miles), Auth, File storage, Realtime.
- **Hetzner VPS:** the Worker (rules, AI, scheduled jobs; only holder of the service key) reads jobs from Postgres and writes results back; Valhalla (truck routes) runs beside it from phase 7.
- **Outside services:** Paddle (checkout, sales tax) talks to the Next.js app via checkout and webhooks; the worker calls Resend (email), Claude API (reads documents) and the US Census geocoder (addresses to coordinates).
- Map tiles are a static Protomaps file on Cloudflare R2 served straight to browsers. Push notifications go from the worker through the browsers' own free push services (VAPID).

### Code structure

One repository, one Next.js app, plus a small worker process. Business rules live in pure functions with no database access, so money and compliance math can be fully tested.

```
truckmates/
  app/
    (marketing)/      landing, pricing, signup
    (office)/         Today inbox, loads, dispatch, billing, settlements, fleet, reports, settings
    d/                driver PWA (works offline)
    api/              webhooks/paddle, driver/sync, uploads
  src/
    domain/           pure functions: money, pay rules, IFTA, state machines (no I/O)
    server/
      context.ts      session -> { userId, companyId, role }
      actions/        thin "use server" wrappers, nothing else
      services/       business logic per module, always takes ctx
      db/             RLS-enforced client, generated types, queries
    ui/               shared components
    driver/           offline store, outbox, sync client
  worker/             queue consumer, rules, AI extraction, scheduled jobs
  supabase/migrations/
  tests/              domain/, rls/, actions/, e2e/
```

| Layer | May do | May not do |
| --- | --- | --- |
| domain/ | Calculate, validate, decide state transitions | Touch the database, network or clock directly |
| actions/ and api/ | Parse input, build ctx from the session, call one service | Contain business logic, accept a company_id |
| services/ | Business logic, role checks, write events | Import the service-role client |
| db/ | Queries with the user's session (RLS on) | Bypass RLS |
| worker/ | Use the service-role client, run rules, call AI | Be imported by the web app |

The worker shares `src/domain` with the web app, so a rule and its screen always compute the same numbers.

### Data access rules

Tenant isolation is enforced three times: in the code layout, in the database, and by tests that fail the build.

In code:
- Every server action is wrapped: `export const createLoad = action(schema, ['owner','dispatcher'], (ctx, input) => loads.create(ctx, input))`. The wrapper builds ctx from the session; input schemas never contain company_id.
- `actions/` files export only wrapped functions. Worker and batch functions live in `worker/`, never in a `"use server"` module (v1 exposed such functions as public endpoints).
- A lint rule blocks importing the service-role client anywhere outside `worker/`.

In the database:
- One helper, `auth_company_ids()`, returns the companies the logged-in user is an active member of. Every tenant table's RLS policy is `company_id in (select auth_company_ids())`.
- Drivers get a narrower policy: only loads, documents and settlements linked to their own driver_id.
- Multi-step money writes (create invoice with lines, approve settlement) are Postgres functions marked `SECURITY INVOKER`, so RLS still applies inside them. No user-callable function takes a company_id argument (v1's money functions trusted one).
- Composite foreign keys `(company_id, id)` make cross-tenant links impossible.

In CI:
- An RLS test creates two companies, then for every table with a company_id checks that company A can't read, insert, update or delete company B's rows. New tables are picked up automatically.
- A test lists every exported server action and fails if any is not wrapped.

### Automation engine

Automation runs on Postgres alone: database triggers record events, a Postgres-backed job queue delivers them, and a small worker applies the rules. No Redis and no paid queue.

1. **Event written atomically.** A trigger on the changed table (load status, stop times, document upload, payment) inserts an `events` row in the same transaction. A change can't happen without its event.
2. **Job queued.** The insert also queues a job in Graphile Worker. It handles retries, and its scheduled tasks replace cron for the daily and weekly jobs.
3. **Rules run.** The worker loads every rule listening for that event type and checks the company's mode for it (auto, suggest or off). Each rule is a small function: event in, actions out.
4. **Result applied.** Auto: the worker performs the step for that event's company only, writes audit_log with actor "automation", and stores what's needed to undo it. Suggest: the worker upserts a `suggestions` row keyed by (company_id, dedupe_key), so a repeated event updates the open card instead of duplicating it.
5. **Accept runs as the person.** A suggestion stores an action name and its parameters. Clicking accept calls the same service the manual screen uses, with the clicking user's ctx, so roles and RLS still apply.

The Today inbox updates live through Supabase Realtime.

### Offline driver app

The driver never edits records; the driver records facts. Every tap (arrived, departed, photo taken) is an event saved on the phone first and sent later, so offline work can't overwrite the office.

| Piece | How it works |
| --- | --- |
| App shell | A service worker caches the driver app so it opens with no signal |
| Local data | IndexedDB holds the driver's current and next loads, stops, addresses and instructions, refreshed whenever online |
| Outbox | Each tap becomes an outbox item with a phone-generated id and the time it really happened |
| Sync | When signal returns or the app opens, the outbox is sent in order to `api/driver/sync`. The id makes each item safe to send twice |
| Photos | Saved locally, then uploaded with resumable uploads (Supabase Storage TUS), so a dropped connection resumes instead of restarting |

Conflict rule:
- Driver facts (times, photos) are append-only and always accepted, stamped with the phone's time.
- Office fields (stops, appointments, rate, assignment) belong to the office. After sync the phone downloads the latest version.
- If the load was reassigned while the driver was offline, the facts are kept and a suggestion asks the dispatcher what to do with them.

iPhone limits: Safari has no background sync, so sync runs when the app opens or regains signal. Web push on iPhone works only after the app is added to the Home Screen, so onboarding walks drivers through that.

### AI document pipeline

AI only turns a document into a structured draft; code validates it and a person confirms it.

1. **Upload.** The file is stored and hashed. The same file uploaded twice reuses the first result at no cost.
2. **Quota check.** The worker checks this month's ai_usage against the plan's quota. Over quota means manual entry, never a surprise bill.
3. **Extract.** The PDF or photo goes to claude-haiku-5-5 with a strict output schema per document kind (rate con, BOL, POD, receipt, lumper).
4. **Validate in code.** Schema check plus business checks: dates in order, rate equals the sum of charges, known state codes. One failure triggers a single retry on claude-sonnet-5-5; a second failure falls back to manual entry.
5. **Match.** Broker, facilities and load are matched to existing records by MC number, address and reference number. Unmatched ones become "create new?" choices.
6. **Review.** The person sees the draft with uncertain fields highlighted, fixes them and confirms. Corrections are saved to tune prompts later.

The raw AI output is kept with the document so any extracted value can be traced back.

### Maps, routing and IFTA miles

| Need | Approach | Cost |
| --- | --- | --- |
| Map display | MapLibre GL with a Protomaps basemap file (OpenStreetMap data) on Cloudflare R2 | Storage only |
| Address to coordinates | US Census Bureau geocoder, saved on the facility record; a pin on the map fixes misses | Free |
| Truck route and miles | Valhalla with the truck profile, called once when a load is booked or its stops change | Fixed server |
| Miles per state (IFTA) | The route line is split by US state boundaries in PostGIS, stored in load_state_miles | Included |
| Repeat lanes | Routes cached by origin and destination facility | Free |

Until the routing server exists (phase 7), total miles and state miles are typed in. The tables don't change when the server arrives.

### Billing and entitlements

Paddle is the only payment system, and the subscriptions table is the only thing the app reads to decide what a company may do.

- **Trial in the app.** Signup sets a 14-day trial, no card. Paddle is involved only when they choose to pay.
- **Two price items.** $99 base (5 trucks) and a $12 "extra truck" item whose quantity is the number of active trucks above 5.
- **Quantity follows the fleet.** When a truck is activated or archived, the worker updates the quantity and Paddle prorates.
- **Company id is set by the server** in Paddle's custom data, never taken from the browser.
- **Webhooks.** `api/webhooks/paddle` verifies the signature, ignores already-processed events and updates subscriptions. Nothing else writes that table.
- **One gate.** `getEntitlements(companyId)` returns plan status, truck limit and AI quota. Every limit check calls it.
- **Failed payment.** 7-day grace period with a banner, then read-only mode. Data is never deleted for non-payment; exports keep working.

### Testing, environments and deployment

| Test layer | Covers | Tool |
| --- | --- | --- |
| Domain | Settlement pay rules, invoice totals and taxes, detention, IFTA, state machines | Vitest |
| RLS | Every tenant table, two-company isolation, driver-only access | Vitest against local Supabase |
| Actions | Every server action is wrapped and role-checked | Vitest |
| End to end | The spine: rate con to load, dispatch, POD offline then sync, invoice, settlement | Playwright |

| Environment | Purpose |
| --- | --- |
| Local | Supabase CLI (Postgres, auth and storage locally), seed data |
| Staging | A second Supabase project and Vercel preview deployments, for design partners to try new features |
| Production | Customers |

Database changes are migration files applied by CI, never by hand. Every pull request runs all four test layers. Errors go to Sentry with company id attached but no customer data.
