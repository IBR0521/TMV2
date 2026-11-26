# TruckMates v2 — project guide for Claude Code

TruckMates is a multi-tenant web app for US trucking carriers with 5–50 trucks.
The spine: load → dispatch → delivery and POD → invoice → driver settlement.
This is a rebuild of v1 ("Spaghetti"), which failed by doing too much. Build only what the current phase brief asks for.

Full spec: docs/spec/ (spec, architecture, screens, flows, approved-mockups). Design kit: src/ui (components) with design/KIT.md and design/reference/. Build plan: docs/build-plan.md.
Read the relevant spec section before starting any task.

## Stack
- Next.js (App Router), TypeScript strict, pnpm. Check current stable versions before installing; do not pin from memory.
- Supabase: Postgres (with PostGIS), Auth, Storage (resumable uploads), Realtime.
- Tailwind CSS, with design tokens generated from design/tokens.json into src/ui/tokens.css.
- Graphile Worker (Postgres job queue) in worker/, a separate Node process.
- Paddle Billing (only payment provider). Resend (email). Claude API (document extraction only).
- MapLibre GL + Protomaps basemap. Valhalla (self-hosted routing, from phase 7). US Census geocoder.
- Vitest (unit, RLS, action tests), Playwright (end to end), Sentry.

## Folders
- app/(marketing), app/(office), app/d (driver PWA), app/api (webhooks, driver sync, uploads)
- src/domain: pure functions only (money, pay rules, IFTA, state machines). No database, network or clock.
- src/server/context.ts: session → { userId, companyId, role }
- src/server/actions: thin "use server" wrappers, nothing else
- src/server/services: business logic per module; always takes ctx
- src/server/db: RLS-enforced Supabase client, generated types, queries
- src/ui: shared components; src/driver: offline store, outbox, sync client
- worker/: job consumer, rules, AI extraction, scheduled jobs. The ONLY place with the service-role key.
- supabase/migrations, tests/domain, tests/rls, tests/actions, tests/e2e

## Non-negotiable rules

### 1. Tenant isolation
- Every tenant table has company_id NOT NULL and an index, child tables too (stops, lines, charges).
- Foreign keys between tenant tables are composite: (company_id, id).
- RLS on every tenant table: company_id in (select auth_company_ids()). Drivers get a narrower policy: only their own loads, documents and settlements.
- Server actions are only exported through the wrapper: action(schema, allowedRoles, handler). ctx comes from the session. Input schemas never contain company_id.
- The service-role client is imported only inside worker/. An ESLint no-restricted-imports rule enforces this.
- No database function callable by authenticated users takes a company_id argument. Multi-step money writes are SECURITY INVOKER functions so RLS still applies.
- Every new tenant table is covered automatically by tests/rls (two companies, read/insert/update/delete across tenants must fail).

### 2. Data
- Money is integer cents. Never floats for money.
- Times are timestamptz; appointment windows also store the facility's IANA time zone.
- Master data is archived (archived_at), never deleted. Financial records are voided, never deleted.
- Human-readable numbers (load, invoice, settlement) come from number_sequences per company.
- Never edit a migration that has been applied; add a new one.

### 3. State machines (transitions only through src/domain)
- Load: draft → booked → dispatched → in_transit → delivered; cancelled from draft, booked, dispatched (TONU charge if dispatched). dispatched → booked = unassign.
- Invoice: draft, sent, partly_paid, paid, void. Overdue is computed from due_on, not stored.
- Settlement: draft, approved (locked), paid, void. Corrections go on the next settlement.
- Billing and pay status are never stored on the load; read them from invoices and settlement lines.

### 4. Automation
- Database triggers on state changes insert an events row and queue a Graphile Worker job in the same transaction.
- Rules live in worker/rules: one small function per rule, event in, actions out. Each company sets every rule to auto, suggest or off (automation_settings).
- Auto actions write audit_log with actor "automation" and store what is needed to undo.
- Suggestions are upserted by (company_id, dedupe_key). Accepting one calls the same service as the manual screen, with the clicking user's ctx.

### 5. Cost
- Do not add any paid or metered service without asking. Allowed: Supabase, Vercel, Hetzner, Paddle, Resend, Claude API.
- Never use: Google Maps, Twilio or any SMS, Firebase, Redis, ProMiles, load board APIs.
- Claude API is used only to read documents. Check ai_usage against the plan quota before every call. Default model claude-haiku-5-5; one retry on claude-sonnet-5-5; then manual entry.
- Geocode each address once and compute each route once; store and reuse the result.

### 6. Billing
- Paddle only. The subscriptions table is the only source of plan, truck limit and AI quota. Read it through getEntitlements(companyId).
- Paddle webhooks: verify the signature, ignore already-processed events.

### 7. UI — build only from the design kit (src/ui)
- Every screen is assembled from components exported by `@/ui` (src/ui/index.ts). Do not design. Do not style one-off elements in pages.
- Before building any screen, open the closest preview in src/ui/previews/ (Today, Dispatch, Load, Driver) and the pattern table in design/KIT.md (section "Building a new screen"). Copy the structure, change the data.
- Tokens only: theme.css removed Tailwind's default colors, shadows, radii and text sizes on purpose. Never add them back. Never use hex colors, rgb(), inline styles, arbitrary values like text-[13px], gradients, shadows, blur, decorative animation, emoji, or UI libraries (shadcn, Radix, MUI, lucide-react, framer-motion...).
- Never use raw <button>, <input>, <select>, <textarea> or <table> in pages: use Button, Input, Select, Textarea, DataTable. (<input type="file"> for uploads is allowed.)
- One primary button per screen: the next step for the record on screen. Orange (warning) only for problems, always with words.
- Dark mode is the default. Geist for text, Geist Mono for money (Amount, AmountRow).
- One screen per thing: "new" and "edit" share one form. Each role sees only its own menu (src/ui/navigation.ts).
- If a needed component does not exist, STOP and ask the owner. Do not improvise one inside a page.
- `pnpm check:ui` and `pnpm test:visual` must pass. Never update the visual baselines (tests/visual/__baseline__) without the owner's written approval.
- The approved look is shown in design/reference/*.html and design/reference/screenshots/. When unsure how something should look, open those, not your own taste.

### 8. Scope
Out of scope unless a brief says otherwise: ELD, HOS, load marketplace, load board integrations, EDI, LTL, hazmat, SSO, public API, white-label portal, gamification, voice AI, chat-with-your-data, autonomous agent, multi-terminal, predictive maintenance, SMS, languages other than English.
If something outside the brief seems necessary, stop and ask.

## Definition of done (every task)
- Typecheck, lint, unit, RLS, action and e2e tests pass; CI is green.
- Migrations apply from an empty database and the seed script works.
- docs/progress.md is updated: done, next, open questions.

## Working style
- Plan first, then build. Show the plan before writing code for a phase.
- One branch per phase, small commits with clear messages.
- Ask before anything destructive: dropping tables, deleting files, force-pushing, changing CI secrets.
- Never start the next phase without the owner's go-ahead.
