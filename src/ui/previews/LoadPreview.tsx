import {
  Amount, AmountRow, AppShell, Breadcrumb, Button, Cell, CellGroup, CellLabel, Columns, MainColumn, PageHeader, Panel, PanelHeader,
  SideColumn, StatusChip, StopItem, Tabs, Timeline,
} from "../index";

/** Approved screen 3 — Load page (#1041, in transit). Matches design/reference/load.html. */
export function LoadPreview() {
  return (
    <AppShell role="owner" active="loads" companyName="Prairie Line Transport" todayCount={6}>
      <Breadcrumb items={[{ label: "Loads", href: "#" }, { label: "#1041" }]} />
      <PageHeader
        title="#1041 · Dallas, TX → Atlanta, GA"
        status={<StatusChip>In transit</StatusChip>}
        subtitle="Northline Logistics · Ref NL-883102 · Luis Ortega · Unit 117 · Trailer 53-08"
      >
        <Button>Edit</Button>
        <Button variant="primary">Mark delivered</Button>
      </PageHeader>

      <Tabs
        items={[
          { label: "Overview", href: "#", active: true },
          { label: "Documents", href: "#", count: 2 },
          { label: "Charges", href: "#" },
          { label: "Check calls", href: "#" },
        ]}
      />

      <Columns gap="md">
        <MainColumn>
          <Panel label="Stops">
            <PanelHeader title="Stops" />
            <StopItem
              number={1}
              state="done"
              label="Pickup · Nov 24, 08:00–10:00"
              title="Lone Star Packaging · Dallas, TX"
              detail="Arrived 08:12 · Departed 09:05 · BOL uploaded"
              aside="Done"
            />
            <StopItem
              number={2}
              state="current"
              label="Delivery · Nov 25, 14:00–16:00"
              title="Harbor Foods DC 12 · Atlanta, GA"
              detail="Lumper usually needed · 2h free time"
              aside="ETA 14:30"
            />
          </Panel>
          <Panel label="Money">
            <PanelHeader title="Money" />
            <CellGroup>
              <Cell>
                <CellLabel>Revenue</CellLabel>
                <AmountRow label="Linehaul" cents={240000} />
                <AmountRow label="Fuel surcharge" cents={31200} />
                <AmountRow label="Total" cents={271200} total />
              </Cell>
              <Cell>
                <CellLabel>Costs</CellLabel>
                <AmountRow label="Driver pay · $0.62/mi" cents={48980} />
                <AmountRow label="Fuel · estimated" cents={43750} />
                <AmountRow label="Total" cents={92730} total />
              </Cell>
              <Cell basis="sm">
                <CellLabel>Profit</CellLabel>
                <Amount cents={178470} className="text-24 font-medium" />
                <div className="text-text-muted">$2.26 per mile · 790 mi</div>
                <div className="text-12 text-text-muted">TX 190 · LA 190 · MS 155 · AL 215 · GA 40</div>
              </Cell>
            </CellGroup>
          </Panel>
        </MainColumn>
        <SideColumn>
          <Panel label="Timeline">
            <PanelHeader title="Timeline" />
            <Timeline
              items={[
                { time: "Nov 25 · 06:05", text: "Check call: on I-20 near Birmingham, AL" },
                { time: "Nov 24 · 09:06", text: "BOL uploaded by Luis from his phone" },
                { time: "Nov 24 · 09:05", text: "Departed pickup" },
                { time: "Nov 24 · 08:12", text: "Arrived at pickup" },
                { time: "Nov 23 · 16:23", text: "Assigned to Luis Ortega, unit 117 (suggested)" },
                { time: "Nov 23 · 16:22", text: "Booked by Sarah Kim" },
                { time: "Nov 23 · 16:20", text: "Created from rate con, 2 fields corrected" },
              ]}
            />
          </Panel>
        </SideColumn>
      </Columns>
    </AppShell>
  );
}
