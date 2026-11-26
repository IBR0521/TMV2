import {
  AppShell, Board, BoardRow, Button, Columns, DateRange, LoadBlock, MainColumn, PageHeader, Panel, PanelHeader, SideColumn, UnassignedLoad,
} from "../index";

const DAYS = [{ label: "Wed 25 · today", today: true }, { label: "Thu 26" }, { label: "Fri 27" }, { label: "Sat 28" }];
const N = DAYS.length;

/** Approved screen 2 — Dispatch board. Matches design/reference/dispatch.html. */
export function DispatchPreview() {
  return (
    <AppShell role="owner" active="dispatch" companyName="Prairie Line Transport" todayCount={6}>
      <PageHeader title="Dispatch" subtitle="6 trucks · 3 loads need a driver">
        <DateRange label="Nov 25 – Nov 28" />
        <Button variant="primary">New load</Button>
      </PageHeader>

      <Columns gap="md">
        <SideColumn narrow>
          <Panel label="Needs a driver">
            <PanelHeader title="Needs a driver" count={3} />
            <UnassignedLoad number="#1045" rateCents={198000} route="Memphis, TN → Chicago, IL" meta="Thu 08:00 · 530 mi" primary />
            <UnassignedLoad number="#1047" rateCents={115000} route="Atlanta, GA → Charlotte, NC" meta="Thu 13:00 · 245 mi" />
            <UnassignedLoad number="#1048" rateCents={89000} route="Dallas, TX → Houston, TX" meta="Fri 06:00 · 240 mi" />
          </Panel>
        </SideColumn>
        <MainColumn>
          <Panel label="Board">
            <Board days={DAYS}>
              <BoardRow days={N} unit="117" driver="Luis Ortega">
                <LoadBlock kind="load" startDay={1} title="#1041 Dallas → Atlanta" detail="In transit · ETA 14:30" />
                <LoadBlock kind="load" startDay={2} span={2} title="#1049 Atlanta → Miami" detail="Booked" />
              </BoardRow>
              <BoardRow days={N} unit="121" driver="Kim Pham">
                <LoadBlock kind="late" startDay={1} title="#1043 Kansas City → Chicago" detail="45 min late" />
                <LoadBlock kind="free" startDay={2} span={2} title="Available · Chicago, IL" />
              </BoardRow>
              <BoardRow days={N} unit="112" driver="Marcus Reed">
                <LoadBlock kind="free" startDay={1} title="Available · Memphis" />
                <LoadBlock kind="suggested" startDay={2} title="Suggested: #1045" detail="Memphis → Chicago" />
              </BoardRow>
              <BoardRow days={N} unit="104" driver="Andre Wilson">
                <LoadBlock kind="free" startDay={1} title="Available · Atlanta" />
                <LoadBlock kind="suggested" startDay={2} title="Suggested: #1047" detail="Atlanta → Charlotte" />
              </BoardRow>
              <BoardRow days={N} unit="108" driver="Jamal Brooks">
                <LoadBlock kind="home" startDay={1} span={2} title="Home time" />
                <LoadBlock kind="load" startDay={3} span={2} title="#1050 Nashville → St. Louis" detail="Booked" />
              </BoardRow>
              <BoardRow days={N} unit="115" driver="Sergei Ivanov">
                <LoadBlock kind="load" startDay={1} span={2} title="#1044 Denver → Phoenix" detail="In transit · ETA Thu 11:00" />
                <LoadBlock kind="free" startDay={3} span={2} title="Available · Phoenix" />
              </BoardRow>
            </Board>
          </Panel>
        </MainColumn>
      </Columns>
    </AppShell>
  );
}
