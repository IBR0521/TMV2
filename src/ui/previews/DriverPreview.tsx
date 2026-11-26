import {
  Button, ChecklistRow, DriverCaption, DriverCard, DriverKeyValue, DriverScreen, IconNavigate, InsetNote,
} from "../index";

/** Approved screen 4 — Driver app, current stop (390×844). Matches design/reference/driver.html. */
export function DriverPreview() {
  return (
    <DriverScreen title="Load #1041" sync={{ offline: true, waiting: 2 }} tab="loads">
      <DriverCaption>Stop 2 of 2 · Delivery</DriverCaption>

      <DriverCard label="Current stop">
        <div className="text-20 font-semibold">Harbor Foods DC 12</div>
        <div className="text-text-secondary mt-1.5 leading-[1.4]">
          4180 Fulton Industrial Blvd
          <br />
          Atlanta, GA 30336
        </div>
        <DriverKeyValue first label="Appointment" value="Today 14:00–16:00" />
        <DriverKeyValue label="Reference" value="NL-883102" />
        <InsetNote>Check in at gate 3. A lumper is usually needed: keep the receipt.</InsetNote>
        <Button size="field" href="#" className="mt-3.5">
          <IconNavigate />
          Navigate
        </Button>
      </DriverCard>

      <Button variant="primary" size="xl">I've arrived</Button>

      <DriverCard label="Documents" padded={false}>
        <ChecklistRow label="BOL" status="Uploaded" />
        <ChecklistRow label="POD" status="After unloading" />
        <ChecklistRow label="Lumper receipt" status="If you pay one" />
      </DriverCard>
    </DriverScreen>
  );
}
