# Product

<!-- impeccable:product-schema 1 -->

Confirmed from the owner's approved specification in `docs/spec/` and `CLAUDE.md`,
which stay the source of truth. This file is the short version design work reads.

## Platform

web

## Users

US trucking carriers running 5–50 trucks. Three people in the office and one on
the road:

- **Owner** — sees all nine sections, approves settlements, carries the money.
- **Dispatcher** — books loads, assigns drivers, watches the board. Five sections.
- **Accounting** — invoices, payments, driver pay, costs. Eight sections.
- **Driver** — a phone in a truck, often with no signal. Records facts (arrived,
  departed, photographed), never edits office records.

The office job runs long and unglamorous: a dispatcher watches the same screen
for most of a shift, often at night, and needs to see what changed without
hunting for it.

## Product Purpose

The spine is load → dispatch → delivery and POD → invoice → driver settlement.
v2 exists because v1 ("Spaghetti") failed by doing too much: 174 screens, ~243k
lines, ~15 paid APIs and cross-tenant security holes. Smaller, cheaper to run,
secure from day one.

## Positioning

Automation that proposes rather than acts behind your back. Every rule runs in
one of three modes a carrier chooses — auto, suggest or off — and a suggestion
is executed by the same code the manual screen uses, as the person who clicked
it. The Today inbox is the product's centre of gravity: ready-made next steps,
not a wall of charts.

## Operating Context

- Office work happens in a browser, often for ten hours, frequently at night.
- The same platform must work at phone width and install as a PWA.
- Drivers work offline; their facts queue on the phone and sync later.
- Money is integer cents; times are timestamptz with the facility's IANA zone.
- Human-readable load, invoice and settlement numbers come from a per-company
  sequence.

## Capabilities and Constraints

- Nine office sections plus Settings; hidden sections are left out of a role's
  menu entirely, and answer 404 if someone types the URL.
- Phase 1 (built) is accounts, companies, roles, RLS, the Today inbox and the
  automation pipe. Fleet and customers are phase 2, loads and dispatch phase 3,
  the driver app phase 4, billing phase 5, settlements phase 6, costs and IFTA
  phase 7, launch phase 8.
- Allowed services: Supabase, Vercel, Hetzner, Paddle, Resend, Claude API.
  Never: Google Maps, Twilio or any SMS, Firebase, Redis, load board APIs.
- English only. Dark is the default theme.

## Brand Commitments

The name TruckMates. Nothing else is binding: on 26 November 2026 the owner
asked for the look and the layout to be reworked, so the navy-and-blue identity
carried over from v1 is evidence of where the product came from, not a
constraint on where it goes. The role rules, the information each screen shows,
and one primary action per screen stay.

## Evidence on Hand

`docs/spec/spec.md` (data model, event catalogue, decisions),
`docs/spec/screens.md` (all 30 screens and who sees what),
`docs/spec/flows.md` (four end-to-end flows),
`docs/spec/approved-mockups.md` (the four screens drawn in detail, including
the sample figures the design previews reuse), `docs/build-plan.md`.
