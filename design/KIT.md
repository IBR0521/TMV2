# TruckMates design kit

The approved TruckMates look, as code. Screens are **assembled from these components**, never designed from scratch. If a screen looks generic, it was not built from the kit.

## What's inside and where it goes in the repo

Unzip the kit into the repo root; every file lands at the same path.

| Kit path | Repo path | What it is |
| --- | --- | --- |
| `src/ui/` | `src/ui/` | The components, tokens (`theme.css`), icons and navigation config |
| `src/ui/previews/` | `src/ui/previews/` | The 4 approved screens rebuilt from kit components: the examples to copy |
| `design/reference/` | `design/reference/` | The original approved mockups as HTML, with screenshots (for humans to look at) |
| `tests/visual/` | `tests/visual/` | Visual test + baseline screenshots (owner-controlled) |
| `scripts/check-ui.mjs` | `scripts/check-ui.mjs` | The UI guard that fails CI on invented styling |
| `design/app-snippets/` | `design/app-snippets/` | The design-preview page and the wiring steps (`wiring.md`) |
| `design/CLAUDE-UI-RULES.md` | replaces section 7 of `CLAUDE.md` | The UI rules Claude Code follows |
| `design/CORRECTION-PROMPT.md` | (paste into Claude Code) | Prompt to make Claude Code rebuild screens from the kit |
| `design/KIT.md` | `design/KIT.md` | This guide |

## How it stops generic design

1. **Tokens only.** `theme.css` deletes Tailwind's default palette, shadows, radii and text sizes. `bg-blue-500`, `shadow-lg`, `rounded-2xl` and `text-lg` simply don't exist; only TruckMates tokens do.
2. **Components only.** Pages import from `@/ui`. The guard (`pnpm check:ui`) fails on raw hex colors, inline styles, arbitrary values, gradients, shadows, decorative animation, raw buttons/inputs/tables, emoji and outside UI libraries.
3. **Pictures as the test.** `pnpm test:visual` renders the 4 approved screens from the kit and compares them to the baseline screenshots. If the kit drifts, the test fails.

## Building a new screen: the patterns

Pick the pattern, copy the closest preview, change the data. Do not invent layouts.

| Screen type | Build it from | Copy from |
| --- | --- | --- |
| Home / inbox | AppShell → PageHeader (SearchField + one primary Button) → SummaryStrip → Columns (Panel of ListRows · Panel of SplitRows) | `TodayPreview` |
| List (Loads, Invoices, Drivers…) | AppShell → PageHeader (SearchField + primary "New …") → Panel → PanelHeader → DataTable | `TodayPreview` header + DataTable |
| Detail (Load, Invoice, Driver…) | AppShell → Breadcrumb → PageHeader (status chip; Edit + one primary next-step button) → Tabs → Columns (Panels · Timeline panel) | `LoadPreview` |
| Board | AppShell → PageHeader → Columns (side Panel · Panel with Board) | `DispatchPreview` |
| Form (new = edit) | Panel → PanelHeader → FormGrid of Field + Input/Select → FormActions (secondary, then one primary) | — |
| Driver app | DriverScreen → DriverCaption → DriverCard(s) → one Button size="xl" variant="primary" | `DriverPreview` |
| Empty list | Panel → PanelHeader → EmptyState with one action | — |

## Rules

- **One primary button per screen**: the next step for the record on screen. In lists of rows, only the first row's button may be primary.
- **Orange (`warning`) only for problems**, always with words: late, overdue, offline, unreadable, missing.
- **Money** is integer cents and is shown with `Amount` or `AmountRow` (Geist Mono).
- **Copy** is short and factual: identifiers first, facts joined with " · ", no exclamation marks, no marketing words, no emoji.
- **Missing component?** Stop and ask the owner. New kit components must use only token classes, follow the look of the existing ones, and get a preview. Never style a one-off element inside a page.
- **Baselines** in `tests/visual/__baseline__` are changed only with the owner's written approval.
