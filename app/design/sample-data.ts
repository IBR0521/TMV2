/**
 * Sample data for the three design previews.
 *
 * Every figure comes from docs/spec/approved-mockups.md, Screen 1 and Screen 2,
 * so the three directions are compared on the same facts the owner already
 * approved. Nothing here touches the database: these routes exist to choose a
 * visual direction, and they are not served in production.
 */

export type Metric = {
  label: string;
  value: string;
  detail: string;
  /** True when the detail is a problem, not just a number. */
  warning?: boolean;
};

export const METRICS: Metric[] = [
  { label: 'In transit', value: '7', detail: '1 running late', warning: true },
  { label: 'Delivered this week', value: '23', detail: '$61,940 revenue' },
  { label: 'Ready to bill', value: '$18,450', detail: '6 loads' },
  { label: 'Overdue', value: '$4,100', detail: '2 invoices', warning: true },
];

export type InboxItem = {
  id: string;
  kind: string;
  headline: string;
  facts: string[];
  action: string;
  /** Money or time at stake, shown where a direction has room for it. */
  stake?: string;
  warning?: boolean;
};

export const INBOX: InboxItem[] = [
  {
    id: 'i1',
    kind: 'New load · from rate con',
    headline: 'Northline Logistics',
    facts: ['Dallas, TX → Atlanta, GA', 'Pickup tomorrow 08:00', '790 mi'],
    stake: '$2,850',
    action: 'Review',
  },
  {
    id: 'i2',
    kind: 'Invoice ready',
    headline: 'Prime Shippers · #1038',
    facts: ['Delivered Nov 24', 'POD and BOL attached', 'Net 30'],
    stake: '$3,120',
    action: 'Send',
  },
  {
    id: 'i3',
    kind: 'Detention',
    headline: 'Atlanta, GA · #1041',
    facts: ['2h 40m over free time', 'Broker usually pays'],
    stake: '$180',
    action: 'Add charge',
  },
  {
    id: 'i4',
    kind: 'Needs a driver',
    headline: 'Memphis, TN → Chicago, IL · #1045',
    facts: ['Pickup tomorrow 08:00', 'Suggested: Marcus Hill, unit 122'],
    stake: '$1,975',
    action: 'Assign',
  },
  {
    id: 'i5',
    kind: 'Document expiring',
    headline: 'Luis Ortega · Medical card',
    facts: ['Expires in 7 days', 'Renewal not uploaded'],
    action: 'Upload renewal',
    warning: true,
  },
  {
    id: 'i6',
    kind: 'POD unreadable',
    headline: 'Dee Baker · #1036',
    facts: ['Photo too dark to read the signature'],
    action: 'Ask again',
    warning: true,
  },
];

export type TruckState = 'transit' | 'late' | 'available' | 'loading' | 'home';

export type Truck = {
  unit: string;
  driver: string;
  state: TruckState;
  status: string;
  where: string;
  /** 0–1, how far through the current run. */
  progress?: number;
};

export const TRUCKS: Truck[] = [
  { unit: '117', driver: 'Luis Ortega', state: 'transit', status: 'ETA 14:30', where: 'I-20 near Birmingham, AL', progress: 0.72 },
  { unit: '104', driver: 'Dee Baker', state: 'late', status: '45 min late', where: 'US-59 near Lufkin, TX', progress: 0.38 },
  { unit: '131', driver: 'Ana Reyes', state: 'transit', status: 'ETA 11:05', where: 'I-40 near Little Rock, AR', progress: 0.55 },
  { unit: '115', driver: 'Ray Kim', state: 'loading', status: 'Loading since 09:40', where: 'Houston, TX' },
  { unit: '122', driver: 'Marcus Hill', state: 'available', status: 'Available', where: 'Memphis, TN' },
  { unit: '109', driver: 'Tom Walsh', state: 'home', status: 'Home time', where: 'Dallas, TX' },
];

export const TRUCK_LABELS: Record<TruckState, string> = {
  transit: 'In transit',
  late: 'Late',
  available: 'Available',
  loading: 'Loading',
  home: 'Home',
};

/** Blocks for the three-day board in direction C. Days are 0, 1, 2. */
export type BoardBlock = {
  unit: string;
  day: number;
  span: number;
  state: TruckState | 'suggested';
  title: string;
  detail: string;
};

export const BOARD: BoardBlock[] = [
  { unit: '117', day: 0, span: 2, state: 'transit', title: '#1041 Dallas → Atlanta', detail: 'In transit · ETA 14:30' },
  { unit: '117', day: 2, span: 1, state: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },
  { unit: '104', day: 0, span: 1, state: 'late', title: '#1039 Houston → Shreveport', detail: '45 min late' },
  { unit: '104', day: 1, span: 2, state: 'transit', title: '#1043 Shreveport → Mobile', detail: 'Booked · 08:00' },
  { unit: '131', day: 0, span: 3, state: 'transit', title: '#1042 Tulsa → Nashville', detail: 'In transit · ETA 11:05' },
  { unit: '115', day: 0, span: 1, state: 'loading', title: '#1044 Houston → Dallas', detail: 'Loading since 09:40' },
  { unit: '115', day: 1, span: 1, state: 'available', title: 'Available · Dallas', detail: '' },
  { unit: '122', day: 0, span: 1, state: 'available', title: 'Available · Memphis', detail: '' },
  { unit: '122', day: 1, span: 2, state: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },
  { unit: '109', day: 0, span: 2, state: 'home', title: 'Home time', detail: 'Back Thursday' },
];

export const DAYS = ['Wed 25 Nov', 'Thu 26 Nov', 'Fri 27 Nov'];

export const UNASSIGNED = [
  { number: '#1045', rate: '$1,975', route: 'Memphis, TN → Chicago, IL', when: 'Tomorrow 08:00', miles: '532 mi' },
  { number: '#1047', rate: '$2,310', route: 'Dallas, TX → Denver, CO', when: 'Thu 06:00', miles: '794 mi' },
  { number: '#1048', rate: '$1,640', route: 'Houston, TX → New Orleans, LA', when: 'Thu 13:00', miles: '348 mi' },
];

export const COMPANY = { name: 'Alpha Freight', trucks: 6, trial: 'Trial · 14 days left' };
