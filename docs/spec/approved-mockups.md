## PART 7 — Approved mockups (described for building)

The owner approved four screens on a design canvas. Two earlier styles were rejected: a generic card-heavy SaaS dashboard and a showy "premium automotive" page with a hero map. **The approved style is v1's navy-and-blue look, cleaned up: calm, practical, a work tool.** Build every screen in this style. Exact colors, type and spacing are in PART 8 (design tokens); token names are given in brackets below.

### Shared office layout

- Page background [bg] near-black navy. Text [text]; secondary lines [text-secondary]; labels and timestamps [text-muted].
- **Left sidebar, 220px**, on [surface] with a 1px [border] right edge, padding 20px 12px:
  - Logo row: a 26×26 rounded square in [primary] with a white "T", then "TruckMates" at 16px/600.
  - Nav items: 16px line icon (stroke 1.8) + label, 8px 10px padding, radius 7px, [text-secondary]. The active item has a [selected] background, [text] label, 500 weight and a [link]-colored icon. Today shows its open-suggestion count on the right in [link].
  - Items in order: Today, Loads, Dispatch, Billing, Driver pay, Fleet, Costs, Customers, Reports; a gap; Settings.
  - Bottom: company name and the user's role, above a [border] line.
  - Only the sections the user's role may see are rendered.
- **Content area:** padding 28px 36px; sections 24px apart.
- **Page header:** title 24px/600 with a [text-muted] subline (date or a count) on the left; a search field (38px, [border-input] outline, [surface] fill, placeholder "Search loads, drivers, invoices") and the one [primary] button on the right.
- **Panels:** [surface] fill, 1px [border] outline, radius 10px. Panel header 14px 20px with a 15px/600 title, an optional grey count, and a [link] link on the right ("View all"). Rows inside are separated by 1px [border] lines, never separate cards.
- At phone width the sidebar stacks above the content, toolbars wrap, wide tables scroll inside their panel.

### Screen 1 — Today

1. Header: "Today", subline "Wednesday, November 25"; search; [primary] "New load".
2. **Summary strip:** one panel split into four cells by vertical [border] lines: In transit (7, with "1 running late" in [warning]); Delivered this week (23, "$61,940 revenue"); Ready to bill ($18,450, "6 loads"); Overdue ($4,100, "2 invoices" in [warning]). Label 13px [text-muted], value 24px/500.
3. Two columns below (wrap on narrow screens):
   - **"Needs you" panel** (wide): rows of a 12px grey label ("New load · from rate con", "Invoice ready", "Detention", "Needs a driver", "Document expiring", "POD unreadable"), one 14px/500 line of facts joined with " · " (for example "Northline Logistics · Dallas, TX → Atlanta, GA · $2,850"), and one small 32px button on the right. Only the first row's button is [primary]; the others are secondary (transparent, [border-control] outline).
   - **"Trucks" panel** (narrow): rows with unit number and driver name on the left, status and location/ETA on the right. Problems such as "45 min late" in [warning]. Header link "Dispatch board".

### Screen 2 — Dispatch board

1. Header: "Dispatch", subline "6 trucks · 3 loads need a driver"; a date range control (‹ Nov 25 – Nov 28 ›); [primary] "New load".
2. **Left panel "Needs a driver"**: one block per unassigned load: load number and rate (Geist Mono) on top, route below, then pickup time and miles in [text-muted] with a small "Assign" button (the first is [primary], the rest secondary).
3. **Board panel**: a grid with a 190px truck column (unit number and driver) and one column per day (today's header in [text]). Each truck row holds blocks spanning whole day columns:
   - Load: [load-fill] with a [load-border] outline, radius 6px, 12px text: "#1041 Dallas → Atlanta" and a status line ("In transit · ETA 14:30").
   - Late load: [warning-fill] with a [warning] outline and the delay in [warning] text.
   - Free truck: dashed [border-control] outline, "Available · Memphis" in [text-muted].
   - Suggested assignment: dashed [primary] outline, "Suggested: #1045" in [link] plus the route.
   - Home time: [neutral-fill] with a [border-input] outline.
   - The board scrolls sideways inside its panel on narrow screens.

### Screen 3 — Load page (example: load #1041, in transit)

1. Breadcrumb "Loads / #1041" in [text-muted].
2. Header: "#1041 · Dallas, TX → Atlanta, GA" with a status chip "In transit" ([link] text on [selected], [load-border] outline, radius 12px); subline "Northline Logistics · Ref NL-883102 · Luis Ortega · Unit 117 · Trailer 53-08". Buttons: secondary "Edit" and [primary] "Mark delivered" (the next status step).
3. Tabs with a 2px [primary] underline on the active tab: Overview, Documents 2, Charges, Check calls.
4. Main column:
   - **Stops panel:** each stop has a numbered 24px circle (done stops outlined; the current stop filled [primary]), a 12px label ("Pickup · Nov 24, 08:00–10:00"), the facility and city at 500 weight, a detail line (arrival/departure times, "Lumper usually needed · 2h free time"), and a right-side status ("Done" or "ETA 14:30" in [link]).
   - **Money panel** in three cells: Revenue lines (Linehaul $2,400.00, Fuel surcharge $312.00, Total $2,712.00); Costs lines (Driver pay · $0.62/mi $489.80, Fuel · estimated $437.50, Total $927.30); Profit ($1,784.70 at 24px in Geist Mono, "$2.26 per mile · 790 mi", and state miles "TX 190 · LA 190 · MS 155 · AL 215 · GA 40"). All amounts in Geist Mono.
5. Right column: **Timeline panel**, newest first: a 12px [text-muted] timestamp over a one-line event ("Check call: on I-20 near Birmingham, AL", "BOL uploaded by Luis from his phone", "Assigned to Luis Ortega, unit 117 (suggested)", "Created from rate con, 2 fields corrected").

### Screen 4 — Driver app, current stop (phone, 390×844)

1. Top bar: "Load #1041" at 16px/600; on the right a sync badge "Offline · 2 waiting" ([warning] text and dot on [warning-fill], [warning-border] outline, radius 12px). When online and synced, the badge is hidden or neutral.
2. "Stop 2 of 2 · Delivery" in [text-muted].
3. **Stop card** ([surface], [border], radius 14px, padding 18px): facility name 20px/600; address in [text-secondary]; a divider; rows "Appointment — Today 14:00–16:00" and "Reference — NL-883102"; an inset note on [surface-raised] ("Check in at gate 3. A lumper is usually needed: keep the receipt."); a full-width 44px secondary "Navigate" button (opens the phone's maps app).
4. **One big [primary] button, 60px tall, radius 14px, 18px/600 text: "I've arrived"** (after arrival it becomes "I've departed").
5. **Documents checklist card:** rows BOL (Uploaded), POD (After unloading), Lumper receipt (If you pay one).
6. Bottom tab bar on [surface] with a [border] top line: Loads, Capture, Pay, Me (22px line icons, 11px labels; active in [link]).
7. Text is 15px (driver-body); touch targets at least 44px.
