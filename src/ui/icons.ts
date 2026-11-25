import {
  Building2,
  CalendarRange,
  ChartBar,
  FileText,
  Inbox,
  Package,
  Receipt,
  Settings,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Line icons only, no emoji (CLAUDE.md, rule 7). src/domain/navigation.ts
 * names an icon as a string; this is where that string becomes a component, so
 * the domain stays free of React.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  today: Inbox,
  loads: Package,
  dispatch: CalendarRange,
  billing: FileText,
  driverPay: Wallet,
  fleet: Truck,
  costs: Receipt,
  customers: Building2,
  reports: ChartBar,
  settings: Settings,
};

/** The stroke width the approved mockups use for sidebar icons. */
export const ICON_STROKE = 1.8;
