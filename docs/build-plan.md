## PART 9 — Build plan: 8 phases

Build one phase at a time, in order. Each phase starts with a plan the owner approves and ends when every "Done when" item is true. Then stop, update docs/progress.md, and wait for the owner to start the next phase. Phases 1–4 are the minimum before design partners (real carriers) start using v2; phases 5–6 are what they will pay for.

### Phase 1 — Foundation

The skeleton everything else stands on: accounts, companies, roles, security tests and the automation pipe. No trucking features yet.

Read: CLAUDE.md; docs/spec/architecture.md (Code structure, Data access rules, Automation engine); docs/spec/screens.md (Navigation, Who sees what); docs/spec/approved-mockups.md (Shared office layout).

Build:
1. Repo scaffold: Next.js + TypeScript strict + pnpm, Tailwind with tokens generated from design/tokens.json, ESLint (including the no-restricted-imports rule for the service-role client), Vitest, Playwright, Sentry, GitHub Actions CI running typecheck, lint, all tests and migrations from an empty database.
2. Supabase locally (CLI) with PostGIS enabled.
3. Migrations: companies, users, memberships (roles: owner, dispatcher, accounting, driver), invitations, subscriptions (trial fields now; Paddle fields added in phase 8), audit_log, number_sequences, files, events, suggestions, automation_settings, ai_usage. Helper function auth_company_ids(). RLS on every tenant table. Composite foreign keys.
4. src/server/context.ts and the action(schema, roles, handler) wrapper.
5. Auth: email + password signup and login, password reset. Signup creates the company (manual form: name, MC, DOT, time zone) and makes the user its owner with a 14-day trial.
6. Team: invite by email with a role; a copyable invite link for drivers (no SMS).
7. Office app shell in the approved style: dark theme, sidebar per role exactly as in "Who sees what", placeholder pages for each section, global search box (no results yet).
8. Today page: renders open suggestions from the suggestions table with Realtime updates, empty state when none.
9. Worker skeleton in worker/: Graphile Worker connected; a trigger helper so a table change writes an events row and queues a job in the same transaction; one test rule that turns a test event into a suggestion.
10. Seed script: two demo companies with users in every role.

Not in this phase: trucks, drivers, loads, billing, Paddle, AI, maps, driver app.

Done when:
- tests/rls proves company A cannot read, insert, update or delete company B's rows in every tenant table, and new tables are picked up automatically.
- A test fails if any exported server action is not wrapped.
- Lint fails when the service-role client is imported outside worker/.
- An owner signs up, invites a dispatcher, and the dispatcher sees exactly 5 menu sections.
- A test event becomes a suggestion that appears on Today without a page refresh.
- CI is green from a clean clone.

### Phase 2 — Fleet and customers

Everything a load will point at: trucks, trailers, drivers, brokers and the places freight moves between, plus the setup wizard.

Read: docs/spec/spec.md (Data model: Fleet and Customers groups); docs/spec/flows.md (1. Signup and setup); docs/spec/screens.md (rows 12–15, 20–22, 29–30).

Build:
1. Migrations: drivers (type: company or owner_operator), trucks, trailers, compliance_documents, customers (type: broker or shipper; send_mode), customer_contacts, facilities (address, lat, lng, IANA time zone, detention_free_minutes, notes). All tenant rules from CLAUDE.md.
2. Screens: Drivers, Driver page, Trucks and trailers (one list with a toggle), Unit page, Customers, Customer page, Facilities. One form for new and edit.
3. Upload widget for compliance documents with expiry dates (Supabase Storage, files table).
4. FMCSA carrier data: a daily worker job downloads FMCSA's public Company Census File into a global (non-tenant) table. At signup, typing a DOT number fills name, address and MC; manual form if not found.
5. Spreadsheet import (CSV and XLSX) for trucks, drivers and customers: column matching with a preview; the company's column choices are remembered.
6. Geocoding: when a facility is saved, a worker job geocodes it with the US Census geocoder and stores lat/lng; the user can drag a pin to fix a miss (MapLibre + Protomaps).
7. Setup wizard after signup: company → fleet import → customers import → invite team → Today with a checklist. Every step after company can be skipped.
8. Rule compliance.expiring (daily scheduled job): suggestions at 30 and 7 days before any compliance document expires.
9. Truck limit: activating a truck checks getEntitlements(companyId). During the trial, no limit.
10. Global search now finds drivers, trucks and customers.

Not in this phase: loads, pay profiles, billing, AI, driver app, maintenance.

Done when:
- A sample CSV of 20 trucks and 20 drivers imports in under 15 minutes from a fresh signup, including the setup wizard.
- A DOT number from the census file fills the company form.
- A facility saved with an address shows on the map at the right place.
- Documents expiring in 30 and 7 days produce one suggestion each, never duplicates.
- RLS tests cover every new table. Playwright covers the setup wizard.

### Phase 3 — Loads and dispatch

The heart of the product: rate con to dispatched load in 3 clicks, the dispatch board and a working Today inbox. Design partners can start after this phase.

Read: docs/spec/spec.md (State machines, Event catalog); docs/spec/architecture.md (AI document pipeline); docs/spec/flows.md (2. Rate confirmation to dispatched load); docs/spec/screens.md (rows 1–5); docs/spec/approved-mockups.md (Screens 1–3).

Build:
1. Migrations: loads, load_stops, load_charges (linehaul, fuel_surcharge, detention, lumper, layover, tonu, other; bill_customer and pay_driver flags), documents (kind, extraction_status, extracted json; files carry a hash), load_state_miles (entered by hand until phase 7).
2. src/domain/load.ts: the load state machine with tests for every allowed and refused transition.
3. Screens: Loads list (status, driver, rate, profit), New load, Load page (tabs: Overview, Documents, Charges, Check calls; timeline on the right; one primary button = next status step), Dispatch board (trucks × days, loads needing a driver on the left), Today wired to real suggestions.
4. Upload anywhere: drop a file on any office page or use New → Upload.
5. AI rate con extraction in the worker: hash (same file reuses the result) → quota check (ai_usage vs getEntitlements) → claude-haiku-5-5 with a strict JSON schema → code validation (dates in order, charges sum to rate, known state codes) → one retry on claude-sonnet-5-5 → else manual entry. Match broker by MC, facilities by address, warn on a duplicate broker reference. Result is a draft load with uncertain fields highlighted; corrections are saved.
6. Rule load.booked: rank drivers and trucks (free on the pickup date, straight-line distance from their last delivery to the pickup, home time due) and suggest the top one. Show it on the board as a dashed suggested block.
7. Check calls on the load (office entry for now) and arrive/depart times on stops entered by the office; rule stop.departed suggests a detention charge when dwell exceeds the facility's free time.
8. Global search finds loads by number and broker reference.
9. Estimated profit on each load: revenue minus driver pay estimate (a flat placeholder rate per mile in company settings until phase 6) minus fuel estimate.
10. Deploy for design partners: production Vercel + Supabase projects, the worker in Docker on a small Hetzner VPS, steps written in docs/ops.md.

Not in this phase: driver app, invoices, settlements, routing server (miles are typed in), IFTA.

Done when:
- Playwright: drop a rate con PDF → open draft → save as booked → assign the suggested driver, in 3 clicks.
- On a set of 10 real rate cons the owner provides, at least 8 come out with no more than 2 fields to correct.
- Over quota, the upload opens the manual form instead of calling the API.
- The detention suggestion appears for a stop with dwell over free time, once.
- RLS tests cover every new table; state machine tests cover every transition.
- The app runs in production with the worker on the VPS.

### Phase 4 — Driver app

The phone app drivers use at the dock: works with no signal, sends photos when it can, and turns a POD into a delivered load on its own.

Read: docs/spec/architecture.md (Offline driver app); docs/spec/flows.md (3. POD to invoice, steps 1–4); docs/spec/screens.md (Driver app screens); docs/spec/approved-mockups.md (Screen 4); design/README.md (driver rules).

Build:
1. Driver PWA at /d: service worker caching the app shell; install prompt, and a walkthrough for adding it to the iPhone Home Screen.
2. Local store (IndexedDB) with the driver's current and next loads, stops, addresses and instructions, refreshed whenever online.
3. Outbox: every tap (arrived, departed, document captured) is stored with a phone-generated id and the real time it happened, then sent in order to app/api/driver/sync when online or when the app opens. Sending the same item twice must change nothing.
4. Photos: saved on the phone, uploaded with resumable uploads (Supabase Storage TUS); several pages of one document are joined into one PDF.
5. Screens D1–D5: My loads, Stop, Capture, My pay (placeholder until phase 6), Me (profile, expiring documents, notification setup). A status badge on every screen shows offline and how many items wait to sync.
6. Conflict rule: driver facts are append-only and always kept; office fields belong to the office. If a load was reassigned while the driver was offline, keep the facts and create a suggestion for the dispatcher.
7. Worker: classify each driver upload (POD, BOL, receipt, lumper ticket) and check it is readable, using the same quota-checked AI pipeline. An unreadable photo creates a "Retake" request on the driver's load and a suggestion for the dispatcher.
8. Rule: a POD on the last stop moves the load to delivered (trigger → event → rule), logged and undoable.
9. Web Push (standard VAPID, no Firebase) for a new load, a retake request and a changed appointment.
10. Driver RLS policy: a driver sees only their own loads, stops, documents and settlements.

Not in this phase: invoices, settlements, routing, office app changes beyond showing driver events on the load timeline.

Done when:
- Playwright with offline emulation: arrive, depart and capture a POD while offline → go online → the load becomes delivered without anyone in the office touching it.
- Replaying the same outbox twice creates no duplicates.
- A blurry test photo triggers a retake request.
- RLS test: a driver cannot read another driver's load, document or settlement.
- The app installs and opens with no network on Android Chrome and iPhone Safari.

### Phase 5 — Billing and factoring

Delivered to invoiced in one click, including factoring, plus recording broker payments that cover several invoices.

Read: docs/spec/spec.md (Data model: Billing); docs/spec/flows.md (3. POD to invoice, steps 5–6); docs/spec/screens.md (rows 6–9 and 27). For the math, the owner will give you v1's detention-invoice.ts and finance-settings.ts (resolveInvoiceTaxes): copy the formulas and their fixes, not the code structure.

Build:
1. Migrations: invoices, invoice_lines, payments, payment_allocations (one payment split across invoices), factoring_companies, factoring_submissions (advance, reserve, fee, status).
2. Postgres function create_invoice_for_load as SECURITY INVOKER (RLS applies), taking only a load id. No company_id argument.
3. src/domain/invoice.ts: totals, accessorial lines, detention, tax-inclusive handling; unit tests with worked examples.
4. Rule load.delivered: draft the invoice from the load's billable charges and build the packet PDF (invoice + rate con + BOL + POD). If a required document is missing, the invoice stays in draft with the reason shown ("Missing BOL").
5. Today suggestion "Invoice #N ready, send to <broker or factor>?": one click emails the packet with Resend and sets the due date from payment terms. Customers marked "own portal" get "send manually" with the packet ready to download.
6. Screens: Invoices (status and age; AR aging as a saved view), Invoice page, Payments (enter one check, tick the invoices it covers, amounts split automatically and editable), Factoring (submissions, advances, reserves, fees), Settings → Invoicing and factoring (numbering, terms, invoice layout, factoring companies).
7. Rule invoice.overdue (daily): mark overdue in views and suggest a reminder email; flag brokers who pay slowly on the customer page.
8. Lumper paid by the driver: the receipt becomes a billable invoice line (the reimbursement side arrives in phase 6).

Not in this phase: settlements, QuickBooks export, Paddle.

Done when:
- Playwright: POD synced → invoice drafted with packet → one click sends it to a test factoring email.
- One $8,400 test payment is split across four invoices and each shows the right balance.
- Invoice math tests pass for linehaul, fuel surcharge, detention, lumper and a tax-inclusive case.
- AR aging totals match a fixture.
- RLS tests cover every new table; no user-callable function takes company_id.

### Phase 6 — Settlements

Weekly driver pay that builds itself, with exceptions flagged and a statement drivers can trust.

Read: docs/spec/spec.md (Data model: Settlements); docs/spec/flows.md (4. Weekly driver pay); docs/spec/screens.md (rows 10–11, 13, D4). For pay rules, the owner will give you v1's settlement-pay-rules.ts: copy the rules, not the structure.

Build:
1. Migrations: pay_profiles (versioned by effective_from and effective_to), recurring_deductions, settlements, settlement_lines (earning, deduction, reimbursement, advance, adjustment).
2. src/domain/pay.ts: per mile, percent of revenue, flat per load and hourly; company drivers and owner-operators; recurring deductions; a negative owner-operator balance carried forward. Unit tests with hand-calculated weeks for every pay type.
3. Scheduled job week.closed (company's chosen day and time, default Sunday midnight in the company time zone): build a draft settlement per driver from delivered loads in the period, plus deductions, advances and reimbursements (lumper receipts paid by the driver).
4. Exceptions flagged on the draft: load missing its POD (held out unless included by hand), pay rule changed mid-week, net below zero.
5. Settlements screen (this week's drafts and past runs, exceptions on top, Approve all) and Settlement page (lines, add bonus or deduction, Approve). Who may approve is a company setting (owner only, or accounting too).
6. Approval locks the settlement at database level; corrections go on the next settlement as adjustment lines.
7. Pay statement PDF; the driver sees it under My pay with a push notification; "Question this" on any line creates a suggestion for accounting.
8. Mark paid (bulk) and a CSV export for the bank or payroll provider.
9. Pay profile and deductions on the Driver page; replace phase 3's placeholder pay estimate with the real pay profile.

Not in this phase: direct bank payouts (payment happens outside TruckMates), expenses, IFTA.

Done when:
- Fixture weeks for all four pay types match hand calculations to the cent.
- An approved settlement cannot be changed, even by a direct database update from the app's user role.
- Playwright: Monday card → review exceptions → Approve all → driver sees the statement.
- RLS tests cover every new table; a driver sees only their own settlements.

### Phase 7 — Costs and IFTA

Real miles from our own routing server, costs per truck and load, and a quarterly IFTA draft.

Read: docs/spec/architecture.md (Maps, routing and IFTA miles); docs/spec/spec.md (Data model: Costs); docs/spec/screens.md (rows 17–19). For IFTA math, the owner will give you v1's ifta.ts: copy the corrected formula (real fleet MPG; tax due net of fuel-tax credit), not the structure.

Build:
1. Add Valhalla to the worker's Hetzner server (upgrade the server if its memory is not enough) with US OpenStreetMap data and the truck profile; document the server size, monthly cost and how to rebuild the tiles in docs/ops.md.
2. Routing service in the worker: when a load is booked or its stops change, compute the truck route once, store total and empty miles, and cache routes by origin and destination facility.
3. Miles per state: split the route line by US state boundaries in PostGIS and store load_state_miles (hand entry stays possible when routing fails).
4. Migrations: expenses, fuel_purchases, ifta_reports, ifta_tax_rates (global, not tenant; loaded from a file each quarter).
5. Receipt photos read by the AI pipeline into a draft expense or fuel purchase; a suggestion asks the user to confirm.
6. Fuel-card CSV import with remembered column matching; a rule matches purchases to trucks and loads and suggests fixes for unmatched ones.
7. Screens: Expenses, Fuel (unmatched first), IFTA (quarters, miles and gallons per state, export).
8. Rule quarter.closed: generate the IFTA draft for review and export.
9. Cost per mile per truck on the Unit page; load profit now uses real miles and real fuel prices where known.

Not in this phase: maintenance, reports, Paddle.

Done when:
- Miles for 5 lanes the owner gives you are within 2% of hand-calculated miles, per state too.
- An IFTA quarter built from a fixture matches a hand calculation, including a state with a credit.
- 48 sample fuel purchases import, with unmatched ones shown first.
- docs/ops.md records the server's monthly cost.
- RLS tests cover every new tenant table.

### Phase 8 — Launch

The last pieces a stranger needs to sign up, pay and run their week without talking to anyone.

Read: docs/spec/spec.md (Decisions, Running costs); docs/spec/architecture.md (Billing and entitlements); docs/spec/screens.md (rows 16, 23, 28–29).

Build:
1. Paddle Billing (sandbox first): a $99/month base item that includes 5 trucks and a $12 "extra truck" item; annual billing with 2 months free. Checkout opens with the company id set server-side in Paddle custom data.
2. app/api/webhooks/paddle: verify the signature, skip already-processed events, update subscriptions. Nothing else writes that table.
3. The worker keeps the extra-truck quantity equal to active trucks above 5; Paddle prorates.
4. Trial end and failed payments: 7-day grace banner, then read-only mode. Nothing is deleted; exports keep working.
5. Settings → Plan and billing: plan, trucks counted, AI quota used, invoices from Paddle.
6. Reports: profit per load, truck, driver and lane; revenue and cost per mile; AR aging; each exportable to CSV.
7. Weekly owner digest email every Monday: the week in numbers plus the 3 most important open suggestions, built from templates (no AI).
8. Maintenance: schedules by miles or days, work orders, cost per truck; rule maintenance.due suggests a work order.
9. Settings → Import and export: QuickBooks-ready CSV and IIF exports for invoices, payments and expenses.
10. Marketing site: landing page, pricing page with the published price, terms and privacy pages, signup. Same calm style as the app.
11. Pre-launch pass: rerun every RLS test, review every SECURITY INVOKER function, rate-limit auth and uploads, confirm daily database backups, Sentry alerts on, a spend limit on every paid account.

Not in this phase: light mode, app store listings, anything in CLAUDE.md's out-of-scope list.

Done when:
- Playwright on staging: a new visitor signs up, finishes setup, starts a trial, pays in the Paddle sandbox, and the app shows the paid plan.
- Adding a 6th truck raises the Paddle quantity; archiving it lowers it.
- Cancelling in the sandbox leads to grace, then read-only, with data intact.
- The Monday digest arrives with correct numbers for a seed company.
- The full spine passes end to end: rate con → dispatch → offline POD → invoice → payment → settlement.
