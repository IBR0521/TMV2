# Progress

## Phase 1 — Foundation

**Status: built, waiting for the owner's review.** Branch `phase-1-foundation`.
Nothing of phase 2 has been started.

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

- `pnpm typecheck`, `pnpm lint` (zero warnings) and `pnpm test` (39 domain and
  action tests) pass.
- `pnpm build` compiles all 27 routes.
- All 8 migrations apply to a brand-new empty PostgreSQL 16 database, and 41
  policy probes pass against it: two carriers, their owners, a dispatcher, a
  driver and a signed-out visitor; cross-tenant read, insert, update and delete
  all refused; events and audit rows unforgeable; the plan unwritable from the
  browser; an owner unable to create a second carrier; an invitation unusable
  from another mailbox.

### What has NOT been proven yet

- **`pnpm test:rls` and `pnpm e2e` have never run.** Both need the Supabase CLI's
  local stack, which needs Docker, and Docker is not installed on this machine.
  The SQL and the policies were checked against a scratch PostgreSQL 16 cluster
  with a small Supabase shim instead (`auth.users`, `auth.uid()`, the roles, the
  realtime publication); PostGIS was skipped there because the Homebrew
  PostgreSQL has no PostGIS build.
- **CI has never run**: there is no GitHub remote yet.
- **Nothing has been seen in a browser.** The screens follow
  `docs/spec/approved-mockups.md` but no one has looked at them.
- **Sentry** is wired and silent: no DSN yet.
- The PWA manifest ships an SVG icon only; proper PNG icons are still to come.

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
11. **Invitations are links, as agreed**, for every role. Email delivery waits
    for Resend in phase 5. Icons are Lucide, as agreed.

### Open questions

None blocking. Two things are needed from the owner before phase 1 can be
called done:

- **Docker** (OrbStack, Docker Desktop or Colima) so the Supabase CLI can run
  locally.
- **A GitHub repository** so CI can run. There is no remote yet; the branch is
  local only.

### To finish phase 1

```
pnpm db:start      # needs Docker
pnpm db:env        # writes .env.local from the local stack
pnpm db:reset      # migrations from empty + the worker's job queue schema
pnpm db:seed       # two demo carriers
pnpm test:rls
pnpm e2e
```

Then the review list in `docs/owner-setup.md`. **Phase 2 does not start until
the owner says so.**
