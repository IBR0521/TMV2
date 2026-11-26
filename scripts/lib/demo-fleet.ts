/**
 * A demo fleet and customer list, so the phase 2 screens can be judged with
 * something on them.
 *
 * Development only; the caller has already checked the database is local. It
 * is idempotent: a company that already has drivers is left alone, so
 * `pnpm db:seed` can be run twice.
 *
 * The names and unit numbers match the sample figures the loads and dispatch
 * screens use, so the app reads as one carrier rather than two sets of
 * made-up data.
 */
import type { Clients } from './provision';

type DriverSeed = {
  name: string;
  phone: string;
  type: 'company' | 'owner_operator';
  home: string;
  /** Unit number of the truck they run, if any. */
  unit?: string;
};

type TruckSeed = { unit: string; vin: string; plate: string; odometer: number };
type TrailerSeed = { unit: string; type: 'dry_van' | 'reefer' | 'flatbed' };

type CustomerSeed = {
  name: string;
  type: 'broker' | 'shipper';
  mc: string | null;
  email: string | null;
  terms: number;
  contact?: { name: string; email: string; phone: string };
};

type FacilitySeed = {
  name: string;
  address: string;
  timezone: string;
  freeMinutes: number;
  coords?: { lat: number; lng: number };
  notes?: string;
};

/** Paperwork, dated relative to the day the seed runs so the chips are alive. */
type PaperSeed = {
  subject: 'driver' | 'truck' | 'trailer';
  /** Driver name or unit number. */
  of: string;
  kind: 'cdl' | 'medical' | 'registration' | 'insurance' | 'inspection';
  inDays: number | null;
  note?: string;
};

export type FleetSeed = {
  drivers: DriverSeed[];
  trucks: TruckSeed[];
  trailers: TrailerSeed[];
  customers: CustomerSeed[];
  facilities: FacilitySeed[];
  paperwork: PaperSeed[];
  /** Email of the demo driver login to tie to a driver row, by name. */
  driverLogin?: { email: string; driverName: string };
};

function date(inDays: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + inDays);
  return day.toISOString().slice(0, 10);
}

export const ALPHA_FLEET: FleetSeed = {
  drivers: [
    { name: 'Luis Ortega', phone: '2145550142', type: 'company', home: 'Laredo, TX', unit: '117' },
    { name: 'Dee Baker', phone: '2145550118', type: 'company', home: 'Houston, TX', unit: '104' },
    { name: 'Ana Reyes', phone: '9185550177', type: 'company', home: 'Tulsa, OK', unit: '131' },
    { name: 'Ray Kim', phone: '2145550163', type: 'owner_operator', home: 'Dallas, TX', unit: '115' },
    { name: 'Marcus Hill', phone: '9015550191', type: 'company', home: 'Memphis, TN', unit: '122' },
    { name: 'Tom Walsh', phone: '5045550134', type: 'company', home: 'New Orleans, LA', unit: '109' },
  ],
  trucks: [
    { unit: '104', vin: '1FUJGBDV8CLBA1041', plate: 'TX 4R18104', odometer: 512_400 },
    { unit: '109', vin: '1FUJGBDV8CLBA1091', plate: 'TX 4R18109', odometer: 288_100 },
    { unit: '115', vin: '3AKJHHDR9LSKV1151', plate: 'TX 4R18115', odometer: 196_750 },
    { unit: '117', vin: '1XKYDP9X7MJ431171', plate: 'TX 4R18117', odometer: 412_980 },
    { unit: '122', vin: '1XPBD49X1ND122122', plate: 'TN 8K44122', odometer: 331_050 },
    { unit: '131', vin: '1FUJGLDR4LLKT1311', plate: 'OK 2P91131', odometer: 147_300 },
  ],
  trailers: [
    { unit: 'T450', type: 'dry_van' },
    { unit: 'T451', type: 'dry_van' },
    { unit: 'R220', type: 'reefer' },
    { unit: 'F110', type: 'flatbed' },
  ],
  customers: [
    {
      name: 'Northline Logistics',
      type: 'broker',
      mc: '883102',
      email: 'ap@northline.test',
      terms: 30,
      contact: { name: 'Pat Moreno', email: 'pat@northline.test', phone: '3125550108' },
    },
    {
      name: 'Gulf Coast Produce',
      type: 'shipper',
      mc: null,
      email: 'invoices@gulfcoast.test',
      terms: 15,
      contact: { name: 'Robin Vega', email: 'robin@gulfcoast.test', phone: '7135550144' },
    },
    { name: 'Midwest Dry Goods', type: 'broker', mc: '220188', email: 'ap@midwestdry.test', terms: 45 },
    { name: 'Prime Shippers', type: 'broker', mc: '440139', email: 'billing@primeship.test', terms: 30 },
    { name: 'Delta River Foods', type: 'shipper', mc: null, email: null, terms: 21 },
  ],
  facilities: [
    {
      name: 'Northline Dallas DC',
      address: '4700 Sunbelt Drive, Dallas, TX 75236',
      timezone: 'America/Chicago',
      freeMinutes: 120,
      coords: { lat: 32.701, lng: -96.925 },
      notes: 'Check in at guard shack. Lumper paid by broker.',
    },
    {
      name: 'Gulf Coast Houston Cold',
      address: '2100 Produce Row, Houston, TX 77023',
      timezone: 'America/Chicago',
      freeMinutes: 60,
      coords: { lat: 29.722, lng: -95.317 },
      notes: 'Reefer at 34F. Night receiving only.',
    },
    {
      name: 'Atlanta Crossdock',
      address: '1890 Fulton Industrial Boulevard, Atlanta, GA 30336',
      timezone: 'America/New_York',
      freeMinutes: 120,
      coords: { lat: 33.75, lng: -84.56 },
    },
    // A real address, so the demo shows the geocoding job doing its job: it
    // starts pending and the worker places it.
    {
      name: 'Memphis Rail Yard',
      address: '4001 Delp Street, Memphis, TN 38118',
      timezone: 'America/Chicago',
      freeMinutes: 90,
    },
    // Deliberately an address the US Census geocoder cannot find, so the
    // "Address not found" state — the one the office fixes by hand — is
    // visible in the demo rather than only in a test.
    {
      name: 'Denver Retail DC',
      address: '12500 East 40th Avenue, Denver, CO 80239',
      timezone: 'America/Denver',
      freeMinutes: 120,
    },
  ],
  paperwork: [
    { subject: 'driver', of: 'Luis Ortega', kind: 'cdl', inDays: 5, note: 'Class A, hazmat' },
    { subject: 'driver', of: 'Luis Ortega', kind: 'medical', inDays: 240 },
    { subject: 'driver', of: 'Dee Baker', kind: 'medical', inDays: -3 },
    { subject: 'driver', of: 'Dee Baker', kind: 'cdl', inDays: 420, note: 'Class A' },
    { subject: 'driver', of: 'Ana Reyes', kind: 'cdl', inDays: 25, note: 'Class A' },
    { subject: 'driver', of: 'Ray Kim', kind: 'cdl', inDays: 610 },
    { subject: 'truck', of: '117', kind: 'registration', inDays: 12 },
    { subject: 'truck', of: '117', kind: 'inspection', inDays: 300 },
    { subject: 'truck', of: '104', kind: 'insurance', inDays: 60 },
    { subject: 'truck', of: '115', kind: 'registration', inDays: 180 },
    { subject: 'trailer', of: 'T450', kind: 'inspection', inDays: 3 },
    { subject: 'trailer', of: 'R220', kind: 'inspection', inDays: 150 },
  ],
  driverLogin: { email: 'driver@alpha.test', driverName: 'Dee Baker' },
};

/** Beta stays small: it exists so isolation is obvious, not to be looked at. */
export const BETA_FLEET: FleetSeed = {
  drivers: [
    { name: 'Dom Price', phone: '7185550123', type: 'company', home: 'Newark, NJ', unit: '201' },
    { name: 'Nina Falk', phone: '7185550155', type: 'company', home: 'Albany, NY', unit: '202' },
  ],
  trucks: [
    { unit: '201', vin: '1XKYDP9X7MJ432011', plate: 'NJ 7T22201', odometer: 90_400 },
    { unit: '202', vin: '1FUJGLDR4LLKT2021', plate: 'NY 3B88202', odometer: 211_900 },
  ],
  trailers: [{ unit: 'B300', type: 'dry_van' }],
  customers: [
    { name: 'Hudson Freight Brokers', type: 'broker', mc: '771204', email: 'ap@hudsonfb.test', terms: 30 },
  ],
  facilities: [
    {
      name: 'Newark Port Terminal',
      address: '1100 Corbin Street, Elizabeth, NJ 07201',
      timezone: 'America/New_York',
      freeMinutes: 120,
    },
  ],
  paperwork: [{ subject: 'driver', of: 'Dom Price', kind: 'cdl', inDays: 500 }],
  driverLogin: { email: 'driver@beta.test', driverName: 'Dom Price' },
};

export async function seedFleet(
  c: Clients,
  companyId: string,
  seed: FleetSeed,
): Promise<{ added: boolean }> {
  const existing = await c.admin
    .from('drivers')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (existing.error) throw new Error(`fleet: ${existing.error.message}`);
  if ((existing.count ?? 0) > 0) return { added: false };

  // Drivers first: trucks point at them, and so does the driver login.
  const drivers = await c.admin
    .from('drivers')
    .insert(
      seed.drivers.map((driver) => ({
        company_id: companyId,
        name: driver.name,
        phone: driver.phone,
        type: driver.type,
        home_location: driver.home,
      })),
    )
    .select('id, name');
  if (drivers.error) throw new Error(`drivers: ${drivers.error.message}`);

  const driverIdByName = new Map(drivers.data.map((row) => [row.name, row.id] as const));
  const ownerOf = new Map(
    seed.drivers.flatMap((driver) =>
      driver.unit === undefined || driver.type !== 'owner_operator'
        ? []
        : [[driver.unit, driverIdByName.get(driver.name) ?? null] as const],
    ),
  );

  const trucks = await c.admin
    .from('trucks')
    .insert(
      seed.trucks.map((truck) => ({
        company_id: companyId,
        unit_number: truck.unit,
        vin: truck.vin,
        plate: truck.plate,
        odometer_miles: truck.odometer,
        owner_driver_id: ownerOf.get(truck.unit) ?? null,
      })),
    )
    .select('id, unit_number');
  if (trucks.error) throw new Error(`trucks: ${trucks.error.message}`);

  const trailers = await c.admin
    .from('trailers')
    .insert(
      seed.trailers.map((trailer) => ({
        company_id: companyId,
        unit_number: trailer.unit,
        type: trailer.type,
      })),
    )
    .select('id, unit_number');
  if (trailers.error) throw new Error(`trailers: ${trailers.error.message}`);

  const customers = await c.admin
    .from('customers')
    .insert(
      seed.customers.map((customer) => ({
        company_id: companyId,
        name: customer.name,
        type: customer.type,
        mc_number: customer.mc,
        billing_email: customer.email,
        payment_terms_days: customer.terms,
      })),
    )
    .select('id, name');
  if (customers.error) throw new Error(`customers: ${customers.error.message}`);

  const customerIdByName = new Map(customers.data.map((row) => [row.name, row.id] as const));
  const contacts = seed.customers.flatMap((customer) =>
    customer.contact === undefined
      ? []
      : [
          {
            company_id: companyId,
            customer_id: customerIdByName.get(customer.name) ?? '',
            name: customer.contact.name,
            email: customer.contact.email,
            phone: customer.contact.phone,
          },
        ],
  );
  if (contacts.length > 0) {
    const inserted = await c.admin.from('customer_contacts').insert(contacts);
    if (inserted.error) throw new Error(`contacts: ${inserted.error.message}`);
  }

  const facilities = await c.admin.from('facilities').insert(
    seed.facilities.map((facility) => ({
      company_id: companyId,
      name: facility.name,
      address: facility.address,
      timezone: facility.timezone,
      detention_free_minutes: facility.freeMinutes,
      notes: facility.notes ?? null,
      lat: facility.coords?.lat ?? null,
      lng: facility.coords?.lng ?? null,
      // A facility with coordinates stands for one the geocoder has already
      // found; the rest wait for the job built later in this phase.
      geocode_status: facility.coords === undefined ? ('pending' as const) : ('found' as const),
      geocoded_at: facility.coords === undefined ? null : new Date().toISOString(),
    })),
  );
  if (facilities.error) throw new Error(`facilities: ${facilities.error.message}`);

  const truckIdByUnit = new Map(trucks.data.map((row) => [row.unit_number, row.id] as const));
  const trailerIdByUnit = new Map(trailers.data.map((row) => [row.unit_number, row.id] as const));

  const paperwork = seed.paperwork.flatMap((paper) => {
    const id =
      paper.subject === 'driver'
        ? driverIdByName.get(paper.of)
        : paper.subject === 'truck'
          ? truckIdByUnit.get(paper.of)
          : trailerIdByUnit.get(paper.of);
    if (id === undefined) return [];

    return [
      {
        company_id: companyId,
        driver_id: paper.subject === 'driver' ? id : null,
        truck_id: paper.subject === 'truck' ? id : null,
        trailer_id: paper.subject === 'trailer' ? id : null,
        kind: paper.kind,
        expires_on: paper.inDays === null ? null : date(paper.inDays),
        note: paper.note ?? null,
      },
    ];
  });

  const documents = await c.admin.from('compliance_documents').insert(paperwork);
  if (documents.error) throw new Error(`paperwork: ${documents.error.message}`);

  // Tie the demo driver login to its driver row, as the office does when it
  // invites a driver. Without it the driver app has no driver.
  if (seed.driverLogin !== undefined) {
    const driverId = driverIdByName.get(seed.driverLogin.driverName);
    const profile = await c.admin
      .from('users')
      .select('id')
      .eq('email', seed.driverLogin.email)
      .maybeSingle();

    if (profile.error) throw new Error(`driver login: ${profile.error.message}`);

    if (driverId !== undefined && profile.data !== null) {
      const linked = await c.admin
        .from('memberships')
        .update({ driver_id: driverId })
        .eq('company_id', companyId)
        .eq('user_id', profile.data.id);
      if (linked.error) throw new Error(`driver login: ${linked.error.message}`);
    }
  }

  return { added: true };
}
