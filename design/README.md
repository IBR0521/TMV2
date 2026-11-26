#### TruckMates design system

TruckMates is a work tool people look at for ten hours, often at night, so the
screen stays quiet until something needs them. Version 2 replaces the navy
panels carried over from v1: the information architecture and the role rules
survived, the look did not.

Everything below is generated from `design/tokens.json` into `src/ui/tokens.css`
by `pnpm tokens`. Change the JSON, never the CSS.

#### Principles

1. **One saturated colour.** Sodium amber is the next step for the record on
   screen, and the section you are in. Nothing decorative is ever amber, and
   there is never a second amber button on a page.
2. **Depth is surface, not shadow.** A shadow is invisible on near-black. Each
   layer is a step lighter than the one beneath: page `bg`, panel `surface`,
   row-under-the-pointer `surface-raised`, menu `selected`.
3. **Hairlines are light, not grey.** Every edge is white at 7–16% opacity, so
   it reads as light catching an edge. A drawn grey line is what made v1 look
   like an admin template.
4. **Lists have no dividers.** A row separates from its neighbours by lifting
   onto `surface-raised` under the pointer. Rules are for the end of a section,
   not between every item.
5. **Numbers first, sentences never.** A row is a name and one line of facts
   joined by `·`: `Load #1045 · Memphis → Chicago · tomorrow 08:00`.
6. **Colour that is not amber is state.** Guide green for on route, on time,
   delivered, paid. Signal red for late, overdue, unreadable, offline — always
   with words beside it, never colour alone.

#### How the dark works

| Layer | Token | Value |
| --- | --- | --- |
| Page | `bg` | `#08090A` — never pure black, or nothing can recede |
| Panel, sidebar | `surface` | `#0E0F11` |
| Hovered row, active nav, input | `surface-raised` | `#141517` |
| Menu, secondary button | `selected` | `#1A1C1F` |

Text runs in four tones and only four: `text` at 92% white for what the screen
is about, `text-secondary` at 62% for the facts under a name, `text-muted` at
44% for labels and chrome icons, `text-faint` at 28% for classifiers and
keyboard hints. Weight stops at 500. Size and tone carry hierarchy; heaviness
does not.

#### Type

Geist for everything, Geist Mono for every figure — money, unit numbers, ETAs,
counts — so digits line up and a column of amounts can be read down.

| Style | Size / line | Weight | Where |
| --- | --- | --- | --- |
| `page-title` | 26 / 32 | 500 | One per page |
| `metric` | 30 / 36 | 500 | The figures a screen exists for (mono) |
| `section-title` | 13 / 18 | 500 | Section and panel headings |
| `body` | 14 / 20 | 400 | Default |
| `body-strong` | 14 / 20 | 500 | Row titles, names, load numbers |
| `label` | 12 / 16 | 400 | The facts line, timestamps |
| `micro` | 11 / 16 | 500 | The label above a figure — the only caps on screen |
| `amount` | 13 / 18 | 400 | Money in tables (mono) |

#### Components

- **Button.** `primary` is amber on `on-primary` ink, one per screen.
  `secondary` is a `selected` surface with no border. `quiet` is text that
  gains a surface under the pointer. Height 36px, radius 8px. No outlines.
- **Panel.** `surface` fill, one hairline, radius 12px. Header is 13/500 with
  an optional muted count and a muted link on the right.
- **Row.** Radius 8px, lifts to `surface-raised` on hover over 140ms. Padding
  10–12px vertical, 8px horizontal inside a panel's 16px gutter.
- **Input.** `surface-raised` fill, `border-input` hairline, amber border on
  focus. The focus ring everywhere is a 2px amber outline, offset 2px.
- **Unit plate.** A truck's number in mono on `surface-raised` with a hairline
  and 5px radius, the way it is painted on the door.
- **Nav item.** Label at `text-secondary`, icon 15px at `text-muted`. The
  active one sits on `surface-raised` with its label at `text` and its icon in
  amber.
- **Empty state.** What will appear here and what to do, never "nothing here".

#### Motion

One authored moment per screen, 140–250ms, exponential ease-out. A run in
progress breathes (`.live-dot`); rows change surface on hover; nothing else
moves. All of it stops under `prefers-reduced-motion`.

#### The browser's own surfaces

Selection is amber at 28%, the focus ring is amber, scrollbars are white at
14% on a transparent track, and every figure is tabular. These ship with
browser defaults that belong to no design system, so they are set deliberately.

#### What this system does not do

No gradient text. No glass or blur as decoration. No coloured left borders on
rows or cards. No same-size card grids standing in for structure. No small grey
label above a heading. No emoji or unicode glyphs where an icon belongs — icons
are Lucide, 15–16px, stroke 1.75. No second typeface as costume: the trade
shows in the figures, the unit plates and the mark.

#### The mark

Two chevrons on an amber plate — a lane marking, not a letter in a box. It
ships as an inline SVG in `src/ui/sidebar.tsx` so it inherits the token colours,
and as `app/icon.svg` for the browser tab and the installed app.
