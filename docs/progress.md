# Progress

## Phase 1 — Foundation

**Status: built and verified locally, waiting for the owner's review.** Branch
`phase-1-foundation`. Every "done when" item is true except the last one, CI,
which cannot run until there is a GitHub remote. Nothing of phase 2 has been
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

- **CI has never run.** There is no GitHub remote, so the workflow in
  `.github/workflows/ci.yml` has never executed. This is the last unticked item
  on the phase 1 "done when" list.
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
11. **`.claude/launch.json`** is a one-entry file so the app can be previewed in
    a browser pane with a single command. It changes nothing about the app.
12. **Invitations are links, as agreed**, for every role. Email delivery waits
    for Resend in phase 5. Icons are Lucide, as agreed.

### Open questions

One thing is needed from the owner: **a GitHub repository**, so CI can run.
The branch is local only; there is no remote.

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

Then the review list in `docs/owner-setup.md`. **Phase 2 does not start until
the owner says so.**
