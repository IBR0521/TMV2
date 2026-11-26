/**
 * Sample board data, so the dispatch screen phase 3 builds can be seen now.
 * Figures follow docs/spec/approved-mockups.md, Screen 2. Nothing here comes
 * from the database; the screen says so.
 */
export type BlockState = 'transit' | 'late' | 'loading' | 'available' | 'home' | 'suggested' | 'booked';

export type BoardBlock = {
  unit: string;
  /** Day index, 0 is today. */
  day: number;
  span: number;
  state: BlockState;
  title: string;
  detail: string;
};

export type BoardTruck = {
  unit: string;
  driver: string;
  trailer: string;
};

export const DAYS = [
  { label: 'Wed', date: '25 Nov', today: true },
  { label: 'Thu', date: '26 Nov', today: false },
  { label: 'Fri', date: '27 Nov', today: false },
  { label: 'Sat', date: '28 Nov', today: false },
];

export const BOARD_TRUCKS: BoardTruck[] = [
  { unit: '117', driver: 'Luis Ortega', trailer: '53-08' },
  { unit: '104', driver: 'Dee Baker', trailer: '53-12' },
  { unit: '131', driver: 'Ana Reyes', trailer: '53-04' },
  { unit: '115', driver: 'Ray Kim', trailer: '53-19' },
  { unit: '122', driver: 'Marcus Hill', trailer: '53-02' },
  { unit: '109', driver: 'Tom Walsh', trailer: '53-07' },
];

export const BOARD_BLOCKS: BoardBlock[] = [
  { unit: '117', day: 0, span: 1, state: 'transit', title: '#1041 Dallas → Atlanta', detail: 'In transit · ETA 14:30' },
  { unit: '117', day: 2, span: 2, state: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },

  { unit: '104', day: 0, span: 1, state: 'late', title: '#1039 Houston → Shreveport', detail: '45 min late' },
  { unit: '104', day: 1, span: 2, state: 'booked', title: '#1043 Shreveport → Mobile', detail: 'Booked · 08:00' },

  { unit: '131', day: 0, span: 2, state: 'transit', title: '#1042 Tulsa → Nashville', detail: 'In transit · ETA 11:05' },
  { unit: '131', day: 3, span: 1, state: 'available', title: 'Available · Nashville', detail: '' },

  { unit: '115', day: 0, span: 1, state: 'loading', title: '#1044 Houston → Dallas', detail: 'Loading since 09:40' },
  { unit: '115', day: 1, span: 1, state: 'available', title: 'Available · Dallas', detail: '' },
  { unit: '115', day: 2, span: 2, state: 'booked', title: '#1047 Dallas → Denver', detail: 'Booked · 06:00' },

  { unit: '122', day: 0, span: 1, state: 'available', title: 'Available · Memphis', detail: '' },
  { unit: '122', day: 1, span: 2, state: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },

  { unit: '109', day: 0, span: 2, state: 'home', title: 'Home time', detail: 'Back Thursday' },
  { unit: '109', day: 2, span: 2, state: 'booked', title: '#1048 Houston → New Orleans', detail: 'Booked · 13:00' },
];

export const UNASSIGNED = [
  {
    number: '1045',
    rate: '$1,975',
    route: 'Memphis, TN → Chicago, IL',
    when: 'Tomorrow 08:00',
    miles: '532 mi',
    suggestion: 'Marcus Hill, unit 122',
  },
  {
    number: '1047',
    rate: '$2,310',
    route: 'Dallas, TX → Denver, CO',
    when: 'Thu 06:00',
    miles: '794 mi',
    suggestion: 'Ray Kim, unit 115',
  },
  {
    number: '1048',
    rate: '$1,640',
    route: 'Houston, TX → New Orleans, LA',
    when: 'Thu 13:00',
    miles: '348 mi',
    suggestion: null,
  },
];
