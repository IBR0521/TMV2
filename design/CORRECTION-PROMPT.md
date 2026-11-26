Paste everything below the line into the Claude Code session that has been producing generic designs. Unzip the design kit into the repo root first (it adds src/ui, design/, tests/visual and scripts/; it does not touch existing files except src/ui).

---

Stop all feature work. The screens you've built don't match the approved TruckMates design: they use generic styling (cards, shadows, gradients, default Tailwind colors, invented layouts). We're replacing your styling with the approved design kit that's now in this repo. Don't design anything yourself in this task.

Do this in order and show me the result of each step:

1. Read `design/KIT.md`, `design/app-snippets/wiring.md` and `design/CLAUDE-UI-RULES.md`. Open `design/reference/screenshots/*.png` to see the approved look.
2. Replace section "### 7. UI" in `CLAUDE.md` with the block in `design/CLAUDE-UI-RULES.md`.
3. Wire the kit exactly as `design/app-snippets/wiring.md` says: the `@/ui` path alias, the geist fonts in `app/layout.tsx`, `app/globals.css` containing only the three lines given, `UiLink` using `next/link`, the design-preview page, the Playwright snapshot path, and the `check:ui` and `test:visual` scripts in package.json and CI.
4. Delete every UI component and style you created outside `src/ui` (shadcn or any components/ui folder, custom Card/Button/Badge components, extra CSS, tailwind config colors). Remove UI libraries from package.json (shadcn, Radix, lucide-react, framer-motion, and so on).
5. Rebuild every existing screen using only `@/ui` components, following the pattern table in `design/KIT.md` and the closest preview in `src/ui/previews/`. Keep all data loading and server logic; replace only the markup.
6. Run `pnpm check:ui` until it reports no problems. Run `pnpm test:visual` until all 4 screens pass. Do not change the baselines or the guard script.
7. If any screen needs something the kit doesn't have, list it and ask me. Don't invent it.

When done, give me the list of screens rebuilt, the check:ui and test:visual results, and any missing components you need me to decide on. Then stop.
