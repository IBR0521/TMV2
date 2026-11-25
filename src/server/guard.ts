import { notFound, redirect } from 'next/navigation';
import { canSeeSection } from '@/domain/navigation';
import { isOfficeRole, type Role } from '@/domain/roles';
import { getContext, type Ctx } from './context';

/**
 * A hidden section is not reachable by typing its URL either. It answers 404
 * rather than "not allowed", which would tell someone what exists.
 */
export async function requireSection(sectionKey: string): Promise<Ctx> {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  if (!isOfficeRole(ctx.role)) redirect('/d');
  if (!canSeeSection(ctx.role, sectionKey)) notFound();
  return ctx;
}

export async function requireRole(sectionKey: string, roles: readonly Role[]): Promise<Ctx> {
  const ctx = await requireSection(sectionKey);
  if (!roles.includes(ctx.role)) notFound();
  return ctx;
}
