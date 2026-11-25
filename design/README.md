#### TruckMates design system

TruckMates is calm, dark and dispatch-first: a work tool people look at for ten hours a night, so it stays quiet until something needs them. This system is taken from the four approved v2 screens (Today, Dispatch board, Load page, Driver app) and carries v1's navy-and-blue identity, cleaned up.

#### Principles

1. **One blue button per screen.** It is always the next step for the record on screen: Review, Assign, Mark delivered, Send, I've arrived. Every other action is a secondary button or a link.
2. **Lines, not piles of cards.** A page has a few panels (`radius-lg`, `border` hairline on `surface`); inside a panel, rows are split by `border` hairlines.
3. **Orange means a problem.** `warning` appears only when something is late, overdue, unreadable or offline, and always with words beside it.
4. **Numbers first, sentences never.** A row is a small label plus one line of facts: `Load #1045 · Memphis → Chicago · tomorrow 08:00`.
5. **Money is always visible:** rate, cost and profit sit on every load, in `amount` (Geist Mono) so digits line up.
6. **Each role sees only its own menu.** Hidden sections are left out, never shown greyed.

#### Colour

Dark is the default and the only theme defined so far; light mode will be added as a second theme later.

- Ground: `bg` for the page, `surface` for panels and the sidebar, `surface-raised` for an inset note.
- Text: `text` for content, `text-secondary` for detail lines and nav, `text-muted` for labels and times.
- Action: `primary` with `on-primary` for the one main button; `link` for links, the active nav icon and suggestions.
- Board: `load-fill` with `load-border` for loads; dashed `border-control` outline for a free truck; `neutral-fill` for home time.
- Problem: `warning` text, on `warning-fill` with `warning-border` when it needs a shape.

#### Type

Geist for everything, Geist Mono for money. Load it from Google Fonts (`family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500`).

- `page-title` once per page; `section-title` on panel headers; `metric` for the summary strip.
- `body` and `body-strong` carry the office app; `label` sits above values in `text-muted`.
- The driver app uses `driver-body` (15px) and a 60px primary button: drivers read it at a glance, often outside.

#### Layout

- Office app: sidebar 220px on `surface` with a `border` right edge; content padding `space-9` sides, `space-6` between sections; panels `radius-lg`, rows padded `space-4` by `space-5`.
- The office app is a page that works on a phone: the sidebar stacks above the content, wide tables scroll inside their panel.
- Driver app: 20px side padding, cards `radius-xl`, touch targets at least 44px, the main button 60px tall.

#### Iconography

Line icons only, 16px in the office app and 22px in the driver tab bar, stroke 1.8, `currentColor`. No filled icons, no emoji, no illustrations.

#### Voice

Short and factual. Say what happened and what to do: "Invoice #1042 is ready", "45 min late", "Offline · 2 waiting". No exclamation marks, no greetings, no marketing words inside the app.

#### Don'ts

- No gradients, glows, shadows, maps as decoration, or big hero sections.
- No rainbow of coloured tags; a grey `label` does the job.
- No second blue button on a screen.
- No colour without words for status.

### Component notes

#### Button

One `primary` button per screen, for the next step of the record on screen; everything else is secondary or a link.

- Primary: `primary` fill, `on-primary` text, 38px tall, `radius-md`. In the driver app the main button is 60px and `radius-xl`.
- Secondary: transparent with a `border-control` outline and `text`.
- Small (inside list rows and board panels): 32px, `radius-sm`, secondary style unless it is the first row of Today.
- Links (`link`) for "View all", "Undo", navigation.
- Labels are verbs naming the step: "Send", "Assign Marcus", "I've arrived". No "OK" or "Submit".

#### StatusChip

A small rounded label for the state of a load, truck or sync; the words carry the meaning and colour only supports it.

- Normal states (booked, in transit, delivered): `link` text on `selected` with a `load-border` outline.
- Idle states (available, home time): `text-secondary` on `surface` with a `border-control` outline.
- Problems (late, overdue, offline, unreadable): `warning` text and dot on `warning-fill` with `warning-border`.
- `radius-chip`, 12px text, weight 500. Never more than one chip beside a title.

#### ListRow

A row inside a panel: a grey `label` line, one `body-strong` line of facts, and at most one small button on the right.

- Rows sit in one panel and are split by `border` hairlines; never a separate card per row.
- Padding `space-4` top and bottom, `space-5` at the sides; `space-4` between the text and the button.
- Facts are joined with " · " and start with the identifier: load number, invoice number or driver.
- Only the first row of the Today inbox gets the primary button; the rest are secondary.

#### LoadBlock

A block on the dispatch board that spans the days a truck is busy, free or at home.

- Load: `load-fill` with a `load-border` outline; first line load number and route, second line status in `text-secondary`.
- Late load: `warning-fill` with a `warning` outline and the delay in words.
- Free slot: dashed `border-control` outline, "Available · city" in `text-muted`.
- Suggested assignment: dashed `primary` outline with "Suggested: #number" in `link`; clicking it assigns.
- Home time: `neutral-fill` with a `border-input` outline.
- `radius-sm`, 12px text, `space-2` between blocks; a block spans whole day columns.
