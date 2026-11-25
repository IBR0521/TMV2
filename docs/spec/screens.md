## PART 5 — Screens

### Navigation

The office app has a left menu with 9 sections plus Settings; every screen is at most one click from a list. Today is the home page after login. Signup and setup sit outside the menu.

| Menu section | Screens (detail pages are opened from their list) |
| --- | --- |
| Today | Today inbox |
| Loads | Loads list, New load, Load page |
| Dispatch | Dispatch board |
| Billing | Invoices, Invoice page, Payments, Factoring |
| Driver pay | Settlements, Settlement page |
| Fleet | Drivers, Driver page, Trucks and trailers, Unit page, Maintenance |
| Costs | Expenses, Fuel, IFTA |
| Customers | Customers, Customer page, Facilities |
| Reports | Reports |
| Settings | Company, Users and roles, Automation, Invoicing and factoring, Plan and billing, Import and export |

### Design rules

1. **One primary button per screen**, and it's the next step in the record's life: Dispatch, Mark delivered, Send invoice, Approve pay.
2. **Every list works the same way:** search, filters, saved views, bulk actions, and a profit or amount column where money is involved.
3. **Every detail page works the same way:** a header with status and the primary button, tabs for the parts, and a timeline of what happened on the right.
4. **One screen per thing.** No separate add and create pages; "new" opens the same form as "edit".
5. **Upload from anywhere.** Drop a file on any page, or use the New button, and v2 works out what it is.
6. **Global search** finds a load, broker, driver, truck or invoice number from any page.
7. **Each role sees only its own menu.**
8. **Money is always visible:** rate, cost and profit on every load, in the list and on the page.

### Office screens

| # | Section | Screen | What it's for | Primary action |
| --- | --- | --- | --- | --- |
| 1 | Today | Today inbox | Ready-made next steps, alerts, AI drafts waiting for review | Accept |
| 2 | Loads | Loads list | Every load with status, driver, rate, profit | New load |
| 3 | Loads | New load | Drop a rate con for an AI draft, or type it in | Save as booked |
| 4 | Loads | Load page | Stops, charges, documents, check calls, timeline, profit | Next status step |
| 5 | Dispatch | Dispatch board | Trucks and drivers by day: free, loaded, late | Assign |
| 6 | Billing | Invoices | All invoices with status and age; AR aging as a view | Send |
| 7 | Billing | Invoice page | Lines, attached documents, payments, factoring status | Send to broker or factor |
| 8 | Billing | Payments | Record a check once and split it across invoices | Record payment |
| 9 | Billing | Factoring | Submissions, advances, reserves, fees | Submit batch |
| 10 | Driver pay | Settlements | This week's drafts and past pay runs | Approve all |
| 11 | Driver pay | Settlement page | Earnings, deductions, reimbursements, statement PDF | Approve |
| 12 | Fleet | Drivers | Drivers with status and expiring documents | Add driver |
| 13 | Fleet | Driver page | Profile, documents, pay profile, deductions, load history | Edit |
| 14 | Fleet | Trucks and trailers | All units with status and what's due | Add unit |
| 15 | Fleet | Unit page | Documents, service schedule, work orders, cost per mile | New work order |
| 16 | Fleet | Maintenance | What's due across the fleet; open work orders | New work order |
| 17 | Costs | Expenses | Costs by load, truck or driver, with receipts | Add expense |
| 18 | Costs | Fuel | Fuel-card imports and purchases, unmatched first | Import CSV |
| 19 | Costs | IFTA | Quarters, miles and gallons per state, report | Export report |
| 20 | Customers | Customers | Brokers and shippers with terms and scorecard | Add customer |
| 21 | Customers | Customer page | Contacts, terms, loads, pay speed, detention history | New load |
| 22 | Customers | Facilities | Pickup and delivery places, free time, notes | Add facility |
| 23 | Reports | Reports | Profit per load, truck, driver and lane; revenue and cost per mile | Export |
| 24 | Settings | Company | Name, MC and DOT, logo, time zone | Save |
| 25 | Settings | Users and roles | Invite people, change roles | Invite |
| 26 | Settings | Automation | Each rule set to auto, suggest or off | Save |
| 27 | Settings | Invoicing and factoring | Numbering, terms, invoice layout, factoring companies | Save |
| 28 | Settings | Plan and billing | Plan, trucks counted, AI quota used, invoices | Change plan |
| 29 | Settings | Import and export | Spreadsheet import, CSV and QuickBooks exports | Import |
| 30 | Signup | Signup and setup | Account, company, import fleet and customers, invite team | Finish setup |

Login, password reset and invite acceptance are small pages, not counted.

### Who sees what

The owner sees all 9 sections, a dispatcher sees 5 and accounting sees 8. Hidden sections are left out of the menu, not shown greyed out.

| Section | Owner | Dispatcher | Accounting |
| --- | --- | --- | --- |
| Today | Everything | Loads, drivers, documents | Invoices, pay, costs |
| Loads | Full | Full | View, edit charges |
| Dispatch | Full | Full | Hidden |
| Billing | Full | Hidden (invoice status shows on the load) | Full |
| Driver pay | Full, approves | Hidden | Full, prepares |
| Fleet | Full | Full, without pay profiles | View |
| Costs | Full | Hidden | Full |
| Customers | Full | Full | Full |
| Reports | Full | Hidden | Full |
| Settings | Full | Own profile | Own profile, invoicing settings |

Who approves settlements (owner only, or accounting too) is a per-company setting.

### Driver app screens

Five screens designed for one thumb, a glance at a dock and no signal. It opens straight onto the current load.

| # | Screen | What it's for | Primary action |
| --- | --- | --- | --- |
| D1 | My loads | Current load on top, then the next ones | Open current load |
| D2 | Stop | Address, appointment, instructions, navigate button | Arrived, then Departed |
| D3 | Capture | Camera for BOL, POD, receipt, lumper ticket; pages joined into one PDF | Send |
| D4 | My pay | Settlements and pay statements | Open statement |
| D5 | Me | Profile, expiring documents, notification and Home Screen setup | Upload renewal |

A status badge on every driver screen shows whether the phone is offline and how many items are waiting to sync.
