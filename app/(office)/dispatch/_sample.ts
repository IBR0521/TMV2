/**
 * Sample board data, so the dispatch screen phase 3 builds can be seen now.
 * Figures follow docs/spec/approved-mockups.md, Screen 2, and the vocabulary
 * is the kit's (LoadBlock kinds). Nothing here comes from the database.
 */
export type BlockKind = 'load' | 'late' | 'free' | 'suggested' | 'home';

export type BoardBlock = {
  unit: string;
  /** 1-based day column where the block starts. */
  startDay: number;
  span?: number;
  kind: BlockKind;
  title: string;
  detail?: string;
};

export const DAYS = [
  { label: 'Wed 25 · today', today: true },
  { label: 'Thu 26' },
  { label: 'Fri 27' },
  { label: 'Sat 28' },
];

export const BOARD_TRUCKS = [
  { unit: '117', driver: 'Luis Ortega' },
  { unit: '104', driver: 'Dee Baker' },
  { unit: '131', driver: 'Ana Reyes' },
  { unit: '115', driver: 'Ray Kim' },
  { unit: '122', driver: 'Marcus Hill' },
  { unit: '109', driver: 'Tom Walsh' },
];

export const BOARD_BLOCKS: BoardBlock[] = [
  { unit: '117', startDay: 1, kind: 'load', title: '#1041 Dallas → Atlanta', detail: 'In transit · ETA 14:30' },
  { unit: '117', startDay: 3, span: 2, kind: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },

  { unit: '104', startDay: 1, kind: 'late', title: '#1039 Houston → Shreveport', detail: '45 min late' },
  { unit: '104', startDay: 2, span: 2, kind: 'load', title: '#1043 Shreveport → Mobile', detail: 'Booked · 08:00' },

  { unit: '131', startDay: 1, span: 2, kind: 'load', title: '#1042 Tulsa → Nashville', detail: 'In transit · ETA 11:05' },
  { unit: '131', startDay: 4, kind: 'free', title: 'Available · Nashville, TN' },

  { unit: '115', startDay: 1, kind: 'load', title: '#1044 Houston → Dallas', detail: 'Loading since 09:40' },
  { unit: '115', startDay: 2, kind: 'free', title: 'Available · Dallas, TX' },
  { unit: '115', startDay: 3, span: 2, kind: 'load', title: '#1047 Dallas → Denver', detail: 'Booked · 06:00' },

  { unit: '122', startDay: 1, kind: 'free', title: 'Available · Memphis, TN' },
  { unit: '122', startDay: 2, span: 2, kind: 'suggested', title: 'Suggested: #1045', detail: 'Memphis → Chicago' },

  { unit: '109', startDay: 1, span: 2, kind: 'home', title: 'Home time' },
  { unit: '109', startDay: 3, span: 2, kind: 'load', title: '#1048 Houston → New Orleans', detail: 'Booked · 13:00' },
];

export const UNASSIGNED = [
  {
    number: '#1045',
    rateCents: 197500,
    route: 'Memphis, TN → Chicago, IL',
    meta: 'Thu 08:00 · 532 mi · suggested: Marcus Hill',
  },
  { number: '#1047', rateCents: 231000, route: 'Dallas, TX → Denver, CO', meta: 'Thu 06:00 · 794 mi' },
  {
    number: '#1048',
    rateCents: 164000,
    route: 'Houston, TX → New Orleans, LA',
    meta: 'Fri 13:00 · 348 mi',
  },
];
