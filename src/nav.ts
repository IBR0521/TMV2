import { NAV_ITEMS, type NavKey } from '@/ui/navigation';

/**
 * Which menu section a pathname belongs to. Shared by the sidebar (which marks
 * the active item) and the server guard (which decides whether a role may open
 * the page), so the two can never disagree.
 */
export function sectionForPath(pathname: string): NavKey | null {
  const segment = '/' + (pathname.split('/').filter(Boolean)[0] ?? '');
  return NAV_ITEMS.find((item) => item.href === segment)?.key ?? null;
}

/**
 * The office path prefixes, written out rather than derived from NAV_ITEMS so
 * that proxy.ts does not pull the kit's icon components into the edge bundle.
 * tests/domain/menu.test.ts fails if this ever drifts from the kit's menu.
 */
export const OFFICE_PATHS = [
  '/today',
  '/loads',
  '/dispatch',
  '/billing',
  '/pay',
  '/fleet',
  '/costs',
  '/customers',
  '/reports',
  '/settings',
] as const;

export function isOfficePath(pathname: string): boolean {
  return OFFICE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}
