import { redirect } from 'next/navigation';
import { isOfficeRole } from '@/domain/roles';
import { getContext, getSession } from '@/server/context';

/** The root is a signpost, not a page: the marketing site arrives in phase 8. */
export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');

  const ctx = await getContext();
  if (!ctx) redirect('/onboarding');
  redirect(isOfficeRole(ctx.role) ? '/today' : '/d');
}
