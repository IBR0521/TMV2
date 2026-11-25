## PART 3 — Product and data spec

### Why v2

v2 is a ground-up rebuild of TruckMates, narrowed to small US carriers, with fixed running costs and security designed in from day one. v1 proved the domain knowledge; v2 keeps that knowledge and drops the sprawl.

| v1 problem | Evidence in v1 | v2 rule |
| --- | --- | --- |
| Too broad | 174 dashboard pages, ~243k lines, 39 test files | About 30 screens. Every feature serves the spine or is cut |
| Metered costs | ~15 paid services (Google Maps in 31 files, ProMiles, Twilio, Firebase, Claude) | Only AI is metered, and it is capped per company |
| Tenant trust | Server actions took a caller-supplied companyId on the admin client | Company always comes from the session, never from input |
| Money RPCs | SECURITY DEFINER functions trusted p_company_id | No database function callable by users trusts a tenant argument |
| Billing drift | 3 providers, 2 sources of plan truth | One provider, one subscriptions table decides entitlements |
| Duplication | 14 entities with both /add and /create routes | One way to do each thing |
| Compliance risk | HOS 14-hour window computed wrongly | No HOS or ELD logic in v2 |

Keep from v1 as reference only (the owner supplies these files when a phase needs them): IFTA math (with fuel-tax credit), detention billing, tax-inclusive invoice handling, settlement pay rules.

### Customer

US asset-based carriers with 5–50 trucks, mostly full truckloads for brokers.

| Shape | Who does the work | What they need most |
| --- | --- | --- |
| 5–15 trucks | The owner dispatches, invoices and pays drivers, often from spreadsheets and QuickBooks | Speed and simplicity |
| 15–50 trucks | A few dispatchers, a bookkeeper, maybe a safety person, often an outsourced back office | Roles, permissions, clean handoffs |

| Role | Uses v2 for |
| --- | --- |
| Owner (admin) | Everything, plus billing, settings and the profit view |
| Dispatcher | Loads, dispatch board, check calls, documents |
| Accounting | Invoices, factoring, payments, settlements, expenses, IFTA |
| Driver | Driver PWA: my loads, stops, document photos, my pay |

How v2 stands out without being bigger: self-serve signup running in under an hour with a published price; rate confirmation PDF to a filled load in seconds; itemized driver pay statements; profit per load and per truck visible everywhere.

### Cost rules

Running costs stay mostly fixed (hosting plus database). The only cost that grows with usage is AI, and every company has a monthly AI quota tied to its plan.

| v1 service | v2 replacement | Cost shape |
| --- | --- | --- |
| Google Maps | MapLibre + OpenStreetMap (Protomaps) tiles, cached geocoding (US Census geocoder) | Fixed |
| ProMiles (truck miles) | Self-hosted Valhalla routing (truck profile); miles per state from the route geometry in PostGIS | Fixed server |
| Twilio SMS | Dropped. Email + Web Push | Free tier |
| Firebase push | Standard Web Push (VAPID) | Free |
| Claude everywhere | Claude only for document extraction, with a quota | Metered, capped |
| Stripe + Paddle + PayPal | Paddle only, as merchant of record (5% + 50¢ per transaction) | Per sale |
| QuickBooks API | CSV/IIF export | Free |
| Upstash Redis | Postgres | Included |
| Sentry, PostHog, Resend | Kept within free tiers where possible | Free tier |

Rule for any new dependency: if it charges per use, it needs a cap, a fallback, or a price passed on to the customer, and the owner must approve it.

### Automation principles

| Level | Used for | Cost | Example |
| --- | --- | --- | --- |
| Rules | The obvious next step after an event (~80% of automation) | Free | POD uploaded on the last stop: load delivered, invoice drafted |
| AI extraction | Turning PDFs and photos into structured data | Metered, capped | Rate confirmation to draft load; receipt to expense |
| Suggestions | Anything touching money or compliance | Free | "Invoice #1042 is ready. Send to factor?" |

- Safe steps run automatically; money and compliance steps become suggestions with one-click accept.
- Everything automatic is logged and can be undone.
- Each company can switch any rule to auto, suggest or off.
- AI output is never saved without a person reviewing it once.
- One suggestion per thing: a repeat event updates the open suggestion instead of adding a duplicate.
- The Today inbox is the home screen: ready-made next steps, most urgent first, each with accept, edit or dismiss.

### Feature scope

10 modules, about 30 office screens, 5 driver screens, 3 AI uses (rate cons, driver documents, receipts).

| # | Module | What it covers | Automation (R = rule, AI = extraction) |
| --- | --- | --- | --- |
| 1 | Loads and dispatch | Multi-stop loads, appointments, rates, accessorials, dispatch board, check calls | AI: rate con to draft load. R: suggest driver and truck (availability, last delivery location, home time). R: detention timer and charge. R: optional broker status emails |
| 2 | Driver PWA | My loads, stops, navigation link, photo upload; works offline and syncs when signal returns | AI: read documents and receipts. R: POD on last stop marks delivered |
| 3 | Billing and factoring | Invoices with document packet, factoring submission, payments (one check split across invoices), AR aging | R: draft invoice on delivery. R: overdue reminders, slow-payer flag |
| 4 | Driver settlements | Pay profiles, deductions, advances, recurring charges, pay statement PDF | R: weekly draft settlements from completed loads |
| 5 | Fleet and people | Trucks, trailers, drivers, documents with expiry dates | R: expiry alerts at 30 and 7 days |
| 6 | Expenses and fuel | Expenses per load or truck, fuel-card CSV import | AI: receipt photos. R: match fuel to trucks and trips |
| 7 | IFTA | Miles and gallons per state, quarterly report | R: quarterly draft report |
| 8 | Customers and brokers | Directory, contacts, terms, factoring status, facilities | R: broker scorecard (pay speed, detention history) |
| 9 | Reports | Profit per load, truck, driver and lane; revenue and cost per mile; AR aging | R: weekly owner digest email |
| 10 | Foundation | Signup, roles, invites, billing, audit log, exports | R: plan limits from one source |

Out of v2: ELD and HOS, load marketplace, load board APIs, gamification, EDI, LTL, hazmat, SSO, public API, white-label portal, voice AI, chat-with-your-data, autonomous agent, multi-terminal, predictive maintenance, SMS, non-English languages.

### Data model

37 tables in 9 groups. Every business table carries company_id; the load is the center everything else hangs from.

Tenant isolation rules:
1. Every tenant table has `company_id NOT NULL`, indexed, including child tables. One uniform RLS policy covers all of them.
2. Links between tables use composite foreign keys `(company_id, id)`, so a row can never point at another company's row.
3. RLS policy: the row's company_id must be in the user's active memberships (`auth_company_ids()`). Drivers additionally see only their own loads, documents and settlements.
4. Request code gets company_id from the session only. The service-role client lives only in the worker.
5. No database function callable by users takes a company_id argument.

Data conventions: money in integer cents; times as `timestamptz`, appointment windows also store the facility's time zone; master data archived, never deleted; financial records voided, never deleted; human-readable numbers from a per-company sequence.

| Group | Table | Purpose | Key columns |
| --- | --- | --- | --- |
| Tenant | companies | The carrier | name, mc_number, dot_number, timezone |
| Tenant | users | Login profile (one per person) | auth_id, name, email |
| Tenant | memberships | Person's role in a company | company_id, user_id, role (owner, dispatcher, accounting, driver), driver_id, status |
| Tenant | invitations | Pending invites | email, role, token, expires_at |
| Tenant | subscriptions | The only source of plan and limits | provider, plan, status, truck_limit, ai_quota, trial_ends_at, current_period_end |
| Fleet | drivers | Drivers | name, phone, type (company, owner_operator), status, home_location |
| Fleet | trucks | Power units | unit_number, vin, plate, status, owner_driver_id, odometer |
| Fleet | trailers | Trailers | unit_number, type (dry_van, reefer, flatbed), status |
| Fleet | compliance_documents | Expiring paperwork | subject_type, subject_id, kind (cdl, medical, registration, insurance, inspection), expires_on, file_id |
| Customers | customers | Brokers and shippers | name, type, mc_number, billing_email, payment_terms_days, send_mode (email, own_portal) |
| Customers | customer_contacts | People at a customer | customer_id, name, email, phone |
| Customers | facilities | Pickup and delivery places, reused | name, address, lat, lng, timezone, detention_free_minutes, notes |
| Loads | loads | A paid haul | load_number, customer_id, broker_ref, status, driver_id, truck_id, trailer_id, total_miles, empty_miles, source (rate_con, manual) |
| Loads | load_stops | Ordered pickups and deliveries | load_id, seq, type, facility_id, appt_start, appt_end, arrived_at, departed_at |
| Loads | load_charges | What the load earns or pays | load_id, kind (linehaul, fuel_surcharge, detention, lumper, layover, tonu, other), amount_cents, bill_customer, pay_driver |
| Loads | load_state_miles | Miles per state for IFTA | load_id, state, miles |
| Documents | files | Stored uploads | storage_path, mime, size, hash, uploaded_by |
| Documents | documents | A typed document, maybe AI-read | file_id, kind (rate_con, bol, pod, receipt, lumper), load_id, extraction_status, extracted (json) |
| Billing | invoices | Bill to a customer | invoice_number, customer_id, status, issued_on, due_on, total_cents, factoring_company_id |
| Billing | invoice_lines | Lines, usually from load charges | invoice_id, load_id, load_charge_id, description, amount_cents |
| Billing | payments | Money received (one check) | customer_id, amount_cents, received_on, method, reference |
| Billing | payment_allocations | Splits one payment across invoices | payment_id, invoice_id, amount_cents |
| Billing | factoring_companies | The carrier's factor | name, submission_email, advance_rate, fee_rate |
| Billing | factoring_submissions | Invoice sent to a factor | invoice_id, submitted_at, advance_cents, reserve_cents, fee_cents, status |
| Settlements | pay_profiles | How a driver is paid, versioned | driver_id, basis (per_mile, percent, flat, hourly), rate, effective_from, effective_to |
| Settlements | recurring_deductions | Insurance, lease, escrow | driver_id, kind, amount_cents, frequency, ends_on |
| Settlements | settlements | A driver's pay for a period | driver_id, period_start, period_end, status, gross_cents, deductions_cents, net_cents |
| Settlements | settlement_lines | Earnings, deductions, reimbursements | settlement_id, kind (earning, deduction, reimbursement, advance, adjustment), load_id, description, amount_cents |
| Costs | expenses | Any cost | category, amount_cents, date, truck_id, driver_id, load_id, document_id, reimburse_driver, deduct_driver |
| Costs | fuel_purchases | Fuel for IFTA and cost per mile | date, truck_id, driver_id, state, gallons, amount_cents, source (import, receipt, manual) |
| Costs | ifta_reports | A quarter's filing draft | year, quarter, status, lines (state, miles, taxable_gallons, purchased_gallons, rate, tax_cents) |
| Costs | ifta_tax_rates | Shared reference rates (global, not tenant) | state, year, quarter, rate |
| Maintenance | maintenance_schedules | Recurring service | unit_type, unit_id, task, interval_miles, interval_days, last_done_on, last_done_odometer |
| Maintenance | work_orders | Service done or planned | unit_type, unit_id, description, status, vendor, cost_cents, completed_on |
| Automation | events | Everything that happened (outbox) | type, subject_type, subject_id, payload, actor_id, occurred_at, processed_at |
| Automation | suggestions | The Today inbox | type, subject_type, subject_id, title, payload, status (open, accepted, dismissed, expired), dedupe_key |
| Automation | automation_settings | Per-company rule modes | rule_key, mode (auto, suggest, off) |

Also needed, small: ai_usage (documents per company per month, checked against the quota), audit_log, number_sequences, and a global fmcsa_carriers table (FMCSA Company Census File, for DOT autofill).

Load status covers operations only. Whether a load is billed, paid or settled is read from its invoice and settlement lines, never stored on the load.

### State machines

- **Load** (six states): draft → booked → dispatched → in_transit → delivered. Cancelled is reachable from draft, booked and dispatched; a load cancelled after dispatch gets a TONU (truck ordered, not used) charge. dispatched → booked means unassign. When a load is delivered it hands off to an invoice (draft, sent, paid) and to settlement lines (draft, approved, paid).
- **Invoice:** draft, sent, partly_paid, paid, void. Overdue is computed from due_on, not stored. Factored invoices track advance and reserve separately.
- **Settlement:** draft, approved, paid, void. Only the owner (or accounting, if the company allows) approves. Approved settlements are locked; corrections go on the next one.
- **Document extraction:** uploaded, extracting, needs_review, confirmed, failed. Failed extraction falls back to manual entry, with no retry loop.

### Event catalog

Every automation starts from one of 16 events. Each change writes an event row in the same database transaction; the worker runs the matching rules. Time-based checks come from scheduled jobs (daily and weekly) in Graphile Worker.

| Event | Fires when | What happens | Mode |
| --- | --- | --- | --- |
| document.uploaded (rate_con) | Rate con PDF uploaded | AI extracts a draft load | Suggest: review the load |
| load.booked | Draft load confirmed | Rank available drivers and trucks | Suggest: assign |
| load.dispatched | Driver and truck assigned | Load sheet sent to the driver's app | Auto |
| stop.arrived | Driver or dispatcher marks arrival | Detention timer starts | Auto |
| stop.departed | Departure recorded | Dwell over free time becomes a detention charge; first pickup moves the load to in transit | Suggest: add charge. Auto: status |
| document.uploaded (pod) | POD on the last stop | Load marked delivered | Auto |
| load.delivered | Load delivered | Invoice drafted with documents attached | Auto draft, suggest: send to broker or factor |
| invoice.sent | Sent to broker or factor | Due date set, factoring submission tracked | Auto |
| invoice.overdue | Daily job: past due date | Reminder email drafted | Suggest: send |
| payment.recorded | Payment entered | Invoice paid or partly paid; factor reserve reconciled | Auto |
| week.closed | Weekly job | Draft settlements built from delivered loads | Auto draft, suggest: approve |
| document.uploaded (receipt) | Receipt photo uploaded | AI extracts an expense or fuel purchase | Suggest: confirm |
| fuel_import.completed | Fuel-card CSV imported | Purchases matched to trucks and loads | Auto, suggest: fix unmatched |
| compliance.expiring | Daily job: 30 and 7 days before expiry | Alert to owner and the driver | Suggest: upload renewal |
| maintenance.due | Daily job or odometer update | Service due by miles or date | Suggest: create work order |
| quarter.closed | Daily job, first day of a quarter | IFTA draft generated | Suggest: review and export |

The weekly owner digest email is not an event; it is a template filled from the reports every Monday (no AI).

### Decisions (all final)

| Topic | Decision |
| --- | --- |
| Billing provider | Paddle only (works for an Uzbekistan-based seller; merchant of record handles US sales tax) |
| HOS / ELD | Not in v2. Dispatch suggestions use availability, last delivery location and home time |
| Driver app | PWA that works offline; facts queue on the phone and sync later |
| Pricing model | Per truck, unlimited users: $99/month includes 5 trucks, then $12 per extra truck; annual = 2 months free |
| Trial | 14 days, no card, handled in the app (Paddle only when they pay) |
| AI quota | About 30 document reads per truck per month (final number after measuring real cost per document) |
| Stack | Next.js + Supabase |
| Invoices | One load per invoice by default; the tables allow multi-load later |
| Payments | Own screen under Billing; one check is entered once and split across invoices |
| Routing | Self-hosted Valhalla (truck profile), from phase 7; before that, miles are typed in |
| Theme | Dark mode default; light mode later as a profile switch |
| Phones | The whole platform works at phone width and installs as a PWA; app store listings only if customers ask |
| Language | English only |

### Running costs (for awareness)

At 10 companies the platform should cost about $59–267/month: Vercel Pro $20–40, Supabase Pro $25–40, storage $0–5, Resend $0–20, Claude $5–90 (Haiku 5.5 at about $0.0015 per document), Hetzner $7–70 (small VPS for the worker; ~$66 dedicated 64 GB when Valhalla is added), domain ~$2. Three customers on the $99 plan cover the high end. Keep it that way: no new metered services.
