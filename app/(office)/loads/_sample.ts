/**
 * Sample loads, so the screen phase 3 builds can be seen and judged now.
 *
 * Phase 1 has no loads table, so nothing here comes from the database and the
 * screen says so plainly. The shape follows docs/spec/spec.md (Data model,
 * Loads group) so that wiring it up in phase 3 is a swap, not a rewrite.
 */
/** One stop of a load, as the kit's StopItem renders it. */
export type Stop = {
  city: string;
  kind: 'pickup' | 'delivery';
  when: string;
  state: 'done' | 'current' | 'upcoming';
};

export type LoadStatus = 'draft' | 'booked' | 'dispatched' | 'in_transit' | 'delivered';

export type SampleLoad = {
  id: string;
  number: string;
  status: LoadStatus;
  late?: boolean;
  customer: string;
  from: string;
  to: string;
  pickup: string;
  delivery: string;
  driver: string | null;
  unit: string | null;
  miles: number;
  rateCents: number;
  costCents: number;
  progress: number;
  stops: Stop[];
  reference: string;
  billed?: 'ready' | 'sent' | 'paid';
};

export const STATUS_LABEL: Record<LoadStatus, string> = {
  draft: 'Draft',
  booked: 'Booked',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
};

export const SAMPLE_LOADS: SampleLoad[] = [
  {
    id: 'l1041',
    number: '1041',
    status: 'in_transit',
    customer: 'Northline Logistics',
    from: 'Dallas, TX',
    to: 'Atlanta, GA',
    pickup: 'Nov 24 08:00',
    delivery: 'Nov 25 14:30',
    driver: 'Luis Ortega',
    unit: '117',
    miles: 790,
    rateCents: 271200,
    costCents: 92730,
    progress: 0.72,
    reference: 'NL-883102',
    stops: [
      { city: 'Dallas, TX', kind: 'pickup', when: 'Nov 24 08:00', state: 'done' },
      { city: 'Birmingham, AL', kind: 'delivery', when: 'passed 11:40', state: 'done' },
      { city: 'Atlanta, GA', kind: 'delivery', when: 'ETA 14:30', state: 'current' },
    ],
  },
  {
    id: 'l1039',
    number: '1039',
    status: 'in_transit',
    late: true,
    customer: 'Gulf Coast Produce',
    from: 'Houston, TX',
    to: 'Shreveport, LA',
    pickup: 'Nov 25 06:00',
    delivery: 'Nov 25 16:10',
    driver: 'Dee Baker',
    unit: '104',
    miles: 243,
    rateCents: 95000,
    costCents: 41200,
    progress: 0.38,
    reference: 'GCP-5512',
    stops: [
      { city: 'Houston, TX', kind: 'pickup', when: 'Nov 25 06:00', state: 'done' },
      { city: 'Lufkin, TX', kind: 'delivery', when: '45 min late', state: 'current' },
      { city: 'Shreveport, LA', kind: 'delivery', when: 'ETA 16:10', state: 'upcoming' },
    ],
  },
  {
    id: 'l1042',
    number: '1042',
    status: 'in_transit',
    customer: 'Midwest Dry Goods',
    from: 'Tulsa, OK',
    to: 'Nashville, TN',
    pickup: 'Nov 24 14:00',
    delivery: 'Nov 26 11:05',
    driver: 'Ana Reyes',
    unit: '131',
    miles: 672,
    rateCents: 218000,
    costCents: 79400,
    progress: 0.55,
    reference: 'MDG-2201',
    stops: [
      { city: 'Tulsa, OK', kind: 'pickup', when: 'Nov 24 14:00', state: 'done' },
      { city: 'Little Rock, AR', kind: 'delivery', when: 'passed 09:20', state: 'done' },
      { city: 'Nashville, TN', kind: 'delivery', when: 'ETA 11:05', state: 'current' },
    ],
  },
  {
    id: 'l1044',
    number: '1044',
    status: 'dispatched',
    customer: 'Harbor Freight Forwarding',
    from: 'Houston, TX',
    to: 'Dallas, TX',
    pickup: 'Nov 25 09:40',
    delivery: 'Nov 25 18:00',
    driver: 'Ray Kim',
    unit: '115',
    miles: 239,
    rateCents: 88000,
    costCents: 37600,
    progress: 0.05,
    reference: 'HFF-7781',
    stops: [
      { city: 'Houston, TX', kind: 'pickup', when: 'loading 09:40', state: 'current' },
      { city: 'Dallas, TX', kind: 'delivery', when: 'Nov 25 18:00', state: 'upcoming' },
    ],
  },
  {
    id: 'l1045',
    number: '1045',
    status: 'booked',
    customer: 'Northline Logistics',
    from: 'Memphis, TN',
    to: 'Chicago, IL',
    pickup: 'Nov 26 08:00',
    delivery: 'Nov 27 10:00',
    driver: null,
    unit: null,
    miles: 532,
    rateCents: 197500,
    costCents: 0,
    progress: 0,
    reference: 'NL-883140',
    stops: [
      { city: 'Memphis, TN', kind: 'pickup', when: 'Nov 26 08:00', state: 'upcoming' },
      { city: 'Chicago, IL', kind: 'delivery', when: 'Nov 27 10:00', state: 'upcoming' },
    ],
  },
  {
    id: 'l1047',
    number: '1047',
    status: 'booked',
    customer: 'Rocky Mountain Retail',
    from: 'Dallas, TX',
    to: 'Denver, CO',
    pickup: 'Nov 27 06:00',
    delivery: 'Nov 28 12:00',
    driver: null,
    unit: null,
    miles: 794,
    rateCents: 231000,
    costCents: 0,
    progress: 0,
    reference: 'RMR-0094',
    stops: [
      { city: 'Dallas, TX', kind: 'pickup', when: 'Nov 27 06:00', state: 'upcoming' },
      { city: 'Denver, CO', kind: 'delivery', when: 'Nov 28 12:00', state: 'upcoming' },
    ],
  },
  {
    id: 'l1048',
    number: '1048',
    status: 'booked',
    customer: 'Delta River Foods',
    from: 'Houston, TX',
    to: 'New Orleans, LA',
    pickup: 'Nov 27 13:00',
    delivery: 'Nov 28 07:00',
    driver: null,
    unit: null,
    miles: 348,
    rateCents: 164000,
    costCents: 0,
    progress: 0,
    reference: 'DRF-3310',
    stops: [
      { city: 'Houston, TX', kind: 'pickup', when: 'Nov 27 13:00', state: 'upcoming' },
      { city: 'New Orleans, LA', kind: 'delivery', when: 'Nov 28 07:00', state: 'upcoming' },
    ],
  },
  {
    id: 'l1038',
    number: '1038',
    status: 'delivered',
    customer: 'Prime Shippers',
    billed: 'ready',
    from: 'Oklahoma City, OK',
    to: 'Memphis, TN',
    pickup: 'Nov 22 07:00',
    delivery: 'Nov 24 15:20',
    driver: 'Luis Ortega',
    unit: '117',
    miles: 476,
    rateCents: 312000,
    costCents: 104900,
    progress: 1,
    reference: 'PS-4401',
    stops: [
      { city: 'Oklahoma City, OK', kind: 'pickup', when: 'Nov 22 07:00', state: 'done' },
      { city: 'Memphis, TN', kind: 'delivery', when: 'Nov 24 15:20', state: 'done' },
    ],
  },
  {
    id: 'l1036',
    number: '1036',
    status: 'delivered',
    customer: 'Gulf Coast Produce',
    billed: 'ready',
    from: 'Mobile, AL',
    to: 'Jacksonville, FL',
    pickup: 'Nov 21 05:00',
    delivery: 'Nov 22 13:00',
    driver: 'Dee Baker',
    unit: '104',
    miles: 383,
    rateCents: 142000,
    costCents: 51800,
    progress: 1,
    reference: 'GCP-5498',
    stops: [
      { city: 'Mobile, AL', kind: 'pickup', when: 'Nov 21 05:00', state: 'done' },
      { city: 'Jacksonville, FL', kind: 'delivery', when: 'Nov 22 13:00', state: 'done' },
    ],
  },
  {
    id: 'l1034',
    number: '1034',
    status: 'delivered',
    customer: 'Midwest Dry Goods',
    billed: 'sent',
    from: 'Kansas City, MO',
    to: 'Indianapolis, IN',
    pickup: 'Nov 19 06:30',
    delivery: 'Nov 20 16:45',
    driver: 'Ana Reyes',
    unit: '131',
    miles: 487,
    rateCents: 168000,
    costCents: 59300,
    progress: 1,
    reference: 'MDG-2188',
    stops: [
      { city: 'Kansas City, MO', kind: 'pickup', when: 'Nov 19 06:30', state: 'done' },
      { city: 'Indianapolis, IN', kind: 'delivery', when: 'Nov 20 16:45', state: 'done' },
    ],
  },
  {
    id: 'l1031',
    number: '1031',
    status: 'delivered',
    customer: 'Prime Shippers',
    billed: 'paid',
    from: 'Atlanta, GA',
    to: 'Charlotte, NC',
    pickup: 'Nov 17 08:00',
    delivery: 'Nov 17 17:30',
    driver: 'Ray Kim',
    unit: '115',
    miles: 245,
    rateCents: 97500,
    costCents: 38100,
    progress: 1,
    reference: 'PS-4388',
    stops: [
      { city: 'Atlanta, GA', kind: 'pickup', when: 'Nov 17 08:00', state: 'done' },
      { city: 'Charlotte, NC', kind: 'delivery', when: 'Nov 17 17:30', state: 'done' },
    ],
  },
  {
    id: 'l1049',
    number: '1049',
    status: 'draft',
    customer: 'Northline Logistics',
    from: 'Chicago, IL',
    to: 'Detroit, MI',
    pickup: 'Nov 28 09:00',
    delivery: 'Nov 28 18:00',
    driver: null,
    unit: null,
    miles: 283,
    rateCents: 118000,
    costCents: 0,
    progress: 0,
    reference: 'NL-883166',
    stops: [
      { city: 'Chicago, IL', kind: 'pickup', when: 'Nov 28 09:00', state: 'upcoming' },
      { city: 'Detroit, MI', kind: 'delivery', when: 'Nov 28 18:00', state: 'upcoming' },
    ],
  },
];

export function money(cents: number): string {
  const dollars = Math.round(cents / 100);
  return '$' + dollars.toLocaleString('en-US');
}

export function perMile(rateCents: number, miles: number): string {
  if (miles === 0) return '—';
  return '$' + (rateCents / 100 / miles).toFixed(2);
}
