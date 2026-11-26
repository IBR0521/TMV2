import { redirect } from 'next/navigation';
import { isOfficeRole } from '@/domain/roles';
import { OfficeShell } from '@/client/office-shell';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { countOpen } from '@/server/services/suggestions';

/**
 * The office shell. Everything inside reads the session cookie, so none of it
 * is prerendered. The frame itself is the kit's AppShell; this only supplies
 * the facts it needs.
 */
export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  if (!isOfficeRole(ctx.role)) redirect('/d');

  const [company, openCount] = await Promise.all([getCompany(ctx), countOpen(ctx)]);

  return (
    <OfficeShell
      role={ctx.role === 'driver' ? 'dispatcher' : ctx.role}
      companyName={company.name}
      todayCount={openCount}
    >
      {children}
    </OfficeShell>
  );
}
