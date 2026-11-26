import * as Sentry from '@sentry/nextjs';
import { type Role, isRole, isOfficeRole } from '@/domain/roles';
import { createDbClient, type Db } from './db/client';
import { NoCompanyError, NotSignedInError } from './errors';

/**
 * session -> { userId, companyId, role }
 *
 * Nothing downstream ever takes a company_id from input: services read it from
 * the context, and the database checks it again through RLS. See CLAUDE.md,
 * rule 1.
 */
export type Session = {
  /** public.users.id, not the auth id. */
  userId: string;
  authId: string;
  email: string;
  name: string;
  db: Db;
};

export { NoCompanyError, NotSignedInError };

export type Ctx = Session & {
  companyId: string;
  role: Role;
  /** Set for drivers once phase 2 links a login to a driver row. */
  driverId: string | null;
};

/** Who is signed in, without needing a company. Null when nobody is. */
export async function getSession(): Promise<Session | null> {
  const db = await createDbClient();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from('users')
    .select('id, email, name')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: profile.id,
    authId: user.id,
    email: profile.email,
    name: profile.name,
    db,
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new NotSignedInError();
  return session;
}

/**
 * The full context. One company per account in v2; if an account is a member of
 * several, the office role wins and then the oldest membership. Company
 * switching is a later phase.
 */
export async function getContext(): Promise<Ctx | null> {
  const session = await getSession();
  if (!session) return null;

  const { data: memberships } = await session.db
    .from('memberships')
    .select('company_id, role, driver_id, created_at')
    .eq('user_id', session.userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (!memberships || memberships.length === 0) return null;

  const chosen =
    memberships.find((m) => isRole(m.role) && isOfficeRole(m.role)) ?? memberships[0];
  if (!chosen || !isRole(chosen.role)) return null;

  Sentry.setTag('company_id', chosen.company_id);

  return {
    ...session,
    companyId: chosen.company_id,
    role: chosen.role,
    driverId: chosen.driver_id,
  };
}

export async function requireContext(): Promise<Ctx> {
  const session = await getSession();
  if (!session) throw new NotSignedInError();
  const ctx = await getContext();
  if (!ctx) throw new NoCompanyError();
  return ctx;
}
