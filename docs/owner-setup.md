## PART 10 — Owner setup and review (for the owner; Claude Code reads it to know what to expect)

### Accounts the owner creates

The owner creates accounts and keys; Claude Code only reads them from `.env.local` and lists every variable in `.env.example`. Ask the owner when a key is needed.

| Account | Needed by | Note |
| --- | --- | --- |
| GitHub | Phase 1 | Repo and CI (GitHub Actions) |
| Supabase | Phase 1 | Free plan for development; Pro when real customers arrive |
| Vercel | Phase 1 | Hobby for development; Pro before launch (Hobby is non-commercial) |
| Sentry | Phase 1 | Free tier |
| Anthropic API key | Phase 3 | Low monthly spend limit; only document reading uses it |
| Hetzner | Phase 3 | Small VPS (about $7/month) for the worker once design partners start; upgraded in phase 7 for the routing server |
| Resend + domain DNS | Phase 5 | Sends invoices and reminders |
| Paddle | Phase 8 | Seller verification takes time; start early; use the sandbox until launch |

### Owner's review after each phase

- [ ] Every "Done when" item is true, seen working in the browser.
- [ ] `pnpm test`, `pnpm test:rls` and `pnpm e2e` pass; CI is green.
- [ ] Nothing was built that the phase didn't ask for.
- [ ] No new paid service or API key appeared without approval.
- [ ] Screens match the approved style: dark, one blue button, thin lines, orange only for problems.
- [ ] docs/progress.md says what was done, what's left and any open questions.

Only after this review does the owner tell Claude Code to start the next phase.
