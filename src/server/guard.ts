import { notFound, redirect } from 'next/navigation';
import { MENU_BY_ROLE, type NavKey } from '@/ui/navigation';
import { sectionForPath } from '@/nav';
import { isOfficeRole, type Role } from '@/domain/roles';
import { getContext, type Ctx } from './context';

export { sectionForPath };

/**
 * Who may open which section.
 *
 * The menu itself lives in src/ui/navigation.ts (the design kit owns it, so the
 * sidebar and this guard can never disagree). A hidden section is not reachable
 * by typing its URL either: it answers 404 rather than "not allowed", which
 * would tell someone what exists.
 */
function canSee(role: Role, key: NavKey): boolean {
  if (!isOfficeRole(role)) return false;
  return MENU_BY_ROLE[role as Exclude<Role, 'driver'>].includes(key);
}

export async function requireSection(key: NavKey): Promise<Ctx> {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  if (!isOfficeRole(ctx.role)) redirect('/d');
  if (!canSee(ctx.role, key)) notFound();
  return ctx;
}

export async function requireRole(key: NavKey, roles: readonly Role[]): Promise<Ctx> {
  const ctx = await requireSection(key);
  if (!roles.includes(ctx.role)) notFound();
  return ctx;
}
