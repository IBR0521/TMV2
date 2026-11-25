/**
 * The office menu: nine sections plus Settings, in the order of the approved
 * mockup, and which roles see each one.
 *
 * docs/spec/screens.md, "Who sees what": the owner sees all 9 sections, a
 * dispatcher 5 and accounting 8. Hidden sections are left out of the menu, not
 * greyed out — so this function decides what is rendered at all.
 *
 * Pure: no database, no network, no clock.
 */
import { type Role } from './roles';

export type NavSection = {
  /** Stable key, also the URL segment. */
  key: string;
  label: string;
  href: string;
  /** Looked up in src/ui/icons.ts; the domain never imports a component. */
  icon: string;
  roles: readonly Role[];
};

const OFFICE = ['owner', 'dispatcher', 'accounting'] as const;

/** The nine sections, in menu order. */
export const NAV_SECTIONS: readonly NavSection[] = [
  { key: 'today', label: 'Today', href: '/today', icon: 'today', roles: OFFICE },
  { key: 'loads', label: 'Loads', href: '/loads', icon: 'loads', roles: OFFICE },
  { key: 'dispatch', label: 'Dispatch', href: '/dispatch', icon: 'dispatch', roles: ['owner', 'dispatcher'] },
  { key: 'billing', label: 'Billing', href: '/billing', icon: 'billing', roles: ['owner', 'accounting'] },
  { key: 'driver-pay', label: 'Driver pay', href: '/driver-pay', icon: 'driverPay', roles: ['owner', 'accounting'] },
  { key: 'fleet', label: 'Fleet', href: '/fleet', icon: 'fleet', roles: OFFICE },
  { key: 'costs', label: 'Costs', href: '/costs', icon: 'costs', roles: ['owner', 'accounting'] },
  { key: 'customers', label: 'Customers', href: '/customers', icon: 'customers', roles: OFFICE },
  { key: 'reports', label: 'Reports', href: '/reports', icon: 'reports', roles: ['owner', 'accounting'] },
];

/** Settings sits after a gap, below the nine, and everyone in the office has it. */
export const SETTINGS_SECTION: NavSection = {
  key: 'settings',
  label: 'Settings',
  href: '/settings',
  icon: 'settings',
  roles: OFFICE,
};

export function navSectionsFor(role: Role): readonly NavSection[] {
  return NAV_SECTIONS.filter((section) => section.roles.includes(role));
}

export function canSeeSection(role: Role, key: string): boolean {
  const section = [...NAV_SECTIONS, SETTINGS_SECTION].find((s) => s.key === key);
  return section ? section.roles.includes(role) : false;
}

/** The section a pathname belongs to, for the active nav item. */
export function sectionForPath(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return null;
  const match = [...NAV_SECTIONS, SETTINGS_SECTION].find((s) => s.key === segment);
  return match ? match.key : null;
}
