## PART 6 — Flows

Four flows carry the product; if these feel fast, v2 feels fast.

| Flow | Who | Clicks by people | Target time |
| --- | --- | --- | --- |
| 1. Signup and setup | Owner | About 8 | Under 15 minutes |
| 2. Rate con to dispatched load | Dispatcher | 3 | Under 1 minute |
| 3. POD to invoice sent | Driver, then accounting | 3 (driver) + 1 (office) | Same day as delivery |
| 4. Weekly driver pay | Accounting, owner | 2 + exceptions | Under 10 minutes a week |

### 1. Signup and setup

An owner goes from the website to a working company in under 15 minutes, with no card and no sales call. Every step after the company details can be skipped and finished later from Today.

1. **Start trial.** Email and password.
2. **Company.** The owner types their DOT number; name, address and MC number fill in from FMCSA's public carrier data, which v2 imports daily into its own table. The owner confirms.
3. **Fleet.** Upload a spreadsheet of trucks and drivers, or type a few rows. v2 matches the columns (Unit #, VIN, Driver name, Phone) and shows a preview. The owner confirms.
4. **Customers.** Upload a customer list (for example a QuickBooks export), or skip; brokers are also created automatically from the first rate confirmations.
5. **Team.** Invite dispatchers and accounting by email with a role. Drivers get an invite link the owner can text from their own phone (no SMS cost).
6. **Today.** The owner lands on Today with a short checklist: upload your first rate con, set driver pay, add your factoring company.

| When something goes wrong | What v2 does |
| --- | --- |
| DOT number not found or new authority | Manual company form, same screen |
| Spreadsheet columns not recognized | The owner picks which column is which once; v2 remembers it |
| Owner leaves halfway | Progress is saved; remaining steps wait on Today |
| Trial ends without paying | Read-only access with a pay banner; nothing is deleted |

### 2. Rate confirmation to dispatched load

The dispatcher drops a PDF and makes 3 clicks: open the draft, save it, assign the suggested driver.

1. **Drop the PDF** anywhere in the office app, or use New → Upload. A "Reading rate con…" card appears on Today.
2. **Open the draft** (click 1). The New load screen is filled in: broker matched by MC number, pickup and delivery matched to known facilities, rate and accessorials split into charges. Uncertain fields are highlighted.
3. **Save as booked** (click 2), after fixing any highlighted field. Each correction is saved.
4. **Assign** (click 3). v2 has already ranked drivers and trucks: free on the pickup date, nearest last delivery, home time due. The dispatcher accepts the top one or picks another.
5. **Driver notified.** The load appears in the driver app with a push notification. In the background v2 computes miles, miles per state and estimated profit.

| When something goes wrong | What v2 does |
| --- | --- |
| AI misreads a value | The field is highlighted; the dispatcher fixes it before saving |
| Same rate con uploaded twice | Warns "This looks like load #1042" by broker and reference number |
| Broker or facility not on file | Offers "Create new" inline, pre-filled from the PDF |
| Company is over its AI quota | Opens the manual form, broker filled in if recognized |
| No driver free on that date | Lists who frees up soonest and where they will be |
| Photo of a paper rate con | Read the same way |

### 3. POD to invoice

The driver taps 3 times at the last stop, with or without signal; v2 does the paperwork; accounting clicks Send once.

1. **Arrived.** The driver taps on reaching the last stop. The detention timer starts, using the facility's free time.
2. **Departed.** If the wait went past free time, v2 drafts a detention charge and asks the dispatcher to confirm it.
3. **Capture POD.** The driver photographs the pages and taps Send. With no signal, photos wait on the phone; the badge shows "2 waiting".
4. **Sync and read.** When signal returns, the upload resumes. v2 checks the photo is a POD, attaches it to the load and marks the load delivered.
5. **Invoice drafted.** Linehaul, accessorials, detention and lumper become lines, and the packet PDF is built: invoice, rate con, BOL, POD.
6. **Send invoice.** Today shows "Invoice #1042 ready, send to <factoring company>?". One click emails the packet and starts the due-date clock.

| When something goes wrong | What v2 does |
| --- | --- |
| Photo is blurry, cut off or not a POD | The driver gets "Retake POD" on the load; the dispatcher sees a card |
| BOL missing from the packet | The invoice stays in draft with the reason shown: "Missing BOL" |
| Driver paid the lumper | The receipt becomes a billable invoice line and a reimbursement on the driver's settlement |
| Phone dies before signal returns | Photos are saved on the phone and sync when it is back on |
| Broker requires their own portal | Marked "send manually", with the packet ready to download |

### 4. Weekly driver pay

Settlements build themselves when the week closes; people only review exceptions and approve.

1. **Week closes** at the company's chosen time (default Sunday midnight, company time zone). For each driver v2 builds a draft from delivered loads using their pay profile, then adds recurring deductions, advances and reimbursements.
2. **Monday card on Today:** "8 settlements ready, $14,230 total, 2 need a look" (example). Click 1 opens Settlements with exceptions on top.
3. **Review exceptions:** a load missing its POD, a pay rule changed mid-week, a net amount below zero. Accounting adds a bonus or deduction line where needed.
4. **Approve all** (click 2). Settlements lock, pay statement PDFs are created, and each driver sees theirs under My pay with a notification.
5. **Mark paid** after the bank transfer (done outside v2). A CSV export for the bank or payroll provider is one click.

| When something goes wrong | What v2 does |
| --- | --- |
| Driver disagrees with a line | "Question this" on the statement; a card goes to accounting |
| Mistake found after approval | Approved settlements stay locked; the fix goes on next week as an adjustment line |
| Owner-operator ends the week negative | The balance carries forward, shown clearly on both settlements |
| Load delivered but POD missing | Held out of the settlement and flagged, unless accounting includes it manually |
