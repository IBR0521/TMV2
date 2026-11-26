import {
  AppShell, Amount, Button, type Column, DataTable, Notice, PageHeader, Panel, PanelHeader,
  SearchField, SelectionBar, StatusChip, Tabs, TextLink,
} from "../index";

type Row = { id: string; number: string; customer: string; lane: string; pickup: string; rateCents: number; late?: boolean };

const ROWS: Row[] = [
  { id: "1", number: "#1041", customer: "Northline Logistics", lane: "Dallas, TX → Atlanta, GA", pickup: "Nov 24 08:00", rateCents: 285000 },
  { id: "2", number: "#1043", customer: "Bluestem Freight", lane: "Kansas City, MO → Chicago, IL", pickup: "Nov 25 06:00", rateCents: 164000, late: true },
  { id: "3", number: "#1045", customer: "Harbor Foods", lane: "Memphis, TN → Chicago, IL", pickup: "Nov 26 08:00", rateCents: 197500 },
];

const COLUMNS: Column<Row>[] = [
  { key: "number", header: "Load", render: (r) => <TextLink href={`/loads/${r.number.slice(1)}`}>{r.number}</TextLink> },
  { key: "status", header: "Status", render: (r) => (r.late ? <StatusChip tone="warning" dot>45 min late</StatusChip> : <StatusChip>In transit</StatusChip>) },
  { key: "customer", header: "Customer", sortable: true, render: (r) => r.customer },
  { key: "lane", header: "Lane", render: (r) => r.lane },
  { key: "pickup", header: "Pickup", sortable: true, render: (r) => r.pickup },
  { key: "rate", header: "Rate", align: "right", sortable: true, render: (r) => <Amount cents={r.rateCents} decimals={false} /> },
];

/**
 * The list pattern, with the parts added after the first four screens: saved
 * views as Tabs, a Notice under the header, sortable columns, row selection
 * and the bar that says what can be done to a selection.
 */
export function ListPreview() {
  return (
    <AppShell role="owner" active="loads" companyName="Prairie Line Transport" todayCount={6} planLabel="Trial · 14 days left">
      <PageHeader title="Loads" subtitle="12 loads">
        <SearchField />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <Notice label="Sample">These rows come from the spec, not the database. Loads is built in phase 3.</Notice>

      <Tabs
        items={[
          { label: "All", href: "/loads", active: true, count: 12 },
          { label: "Needs a driver", href: "/loads?view=driver", count: 3 },
          { label: "Ready to bill", href: "/loads?view=billing", count: 2 },
        ]}
      />

      <Panel label="Loads">
        <PanelHeader title="All loads" count={3} />
        <SelectionBar count={2}>
          <Button size="sm">Assign driver</Button>
          <Button size="sm" variant="primary">Create invoices</Button>
        </SelectionBar>
        <DataTable
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.id}
          sort={{ key: "pickup", direction: "asc" }}
          selected={["1", "2"]}
        />
      </Panel>
    </AppShell>
  );
}
