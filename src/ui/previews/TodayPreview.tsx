import {
  AppShell, Button, Columns, ListRow, MainColumn, Metric, PageHeader, Panel, PanelHeader, SearchField, SideColumn, SplitRow, SummaryStrip,
} from "../index";

/** Approved screen 1 — Today. Rebuilt only from kit components. Matches design/reference/today.html. */
export function TodayPreview() {
  return (
    <AppShell role="owner" active="today" companyName="Prairie Line Transport" todayCount={6}>
      <PageHeader title="Today" subtitle="Wednesday, November 25">
        <SearchField />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <SummaryStrip>
        <Metric label="In transit" value="7" sub="1 running late" tone="warning" />
        <Metric label="Delivered this week" value="23" sub="$61,940 revenue" />
        <Metric label="Ready to bill" value="$18,450" sub="6 loads" />
        <Metric label="Overdue" value="$4,100" sub="2 invoices" tone="warning" />
      </SummaryStrip>

      <Columns>
        <MainColumn>
          <Panel label="Needs you">
            <PanelHeader title="Needs you" count={6} action={{ label: "View all", href: "#" }} />
            <ListRow
              label="New load · from rate con"
              title="Northline Logistics · Dallas, TX → Atlanta, GA · $2,850"
              action={<Button variant="primary" size="sm">Review</Button>}
            />
            <ListRow label="Invoice ready" title="#1042 · Bluestem Freight · $3,120 · to Ridgeway Factoring" action={<Button size="sm">Send</Button>} />
            <ListRow label="Detention" title="Load #1038 · waited 3h 40m at Harbor Foods DC 12 · $125" action={<Button size="sm">Add charge</Button>} />
            <ListRow
              label="Needs a driver"
              title="Load #1045 · Memphis → Chicago · tomorrow 08:00 · suggested: Marcus Reed"
              action={<Button size="sm">Assign</Button>}
            />
            <ListRow label="Document expiring" title="Luis Ortega · medical card · expires Dec 2" action={<Button size="sm">Remind</Button>} />
            <ListRow label="POD unreadable" title="Load #1036 · Kim Pham · page 2 is blurry" action={<Button size="sm">Ask for retake</Button>} />
          </Panel>
        </MainColumn>
        <SideColumn>
          <Panel label="Trucks">
            <PanelHeader title="Trucks" action={{ label: "Dispatch board", href: "#" }} />
            <SplitRow title="Unit 117" subtitle="Luis Ortega" value="In transit" valueSub="Atlanta, ETA 14:30" />
            <SplitRow title="Unit 121" subtitle="Kim Pham" value="45 min late" valueSub="Chicago, ETA 16:15" tone="warning" />
            <SplitRow title="Unit 112" subtitle="Marcus Reed" value="Available" valueSub="Memphis, TN" />
            <SplitRow title="Unit 104" subtitle="Andre Wilson" value="Available" valueSub="Atlanta, GA" />
          </Panel>
        </SideColumn>
      </Columns>
    </AppShell>
  );
}
