import { redirect } from 'next/navigation';
import { isOfficeRole } from '@/domain/roles';
import { trialLabel } from '@/domain/trial';
import { OfficeShell } from '@/client/office-shell';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { getEntitlements } from '@/server/services/entitlements';
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

  const [company, entitlements, openCount] = await Promise.all([
    getCompany(ctx),
    getEntitlements(ctx),
    countOpen(ctx),
  ]);

  const planLabel =
    entitlements.status === 'trialing'
      ? trialLabel(entitlements.trialEndsAt, new Date())
      : entitlements.plan;

  return (
    <OfficeShell
      role={ctx.role === 'driver' ? 'dispatcher' : ctx.role}
      companyName={company.name}
      todayCount={openCount}
      planLabel={planLabel}
    >
      {children}
    </OfficeShell>
  );
}
