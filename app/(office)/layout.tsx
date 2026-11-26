import { redirect } from 'next/navigation';
import { trialLabel } from '@/domain/trial';
import { isOfficeRole, roleLabel } from '@/domain/roles';
import { TopBar } from '@/ui/app-frame';
import { Sidebar } from '@/ui/sidebar';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { getEntitlements } from '@/server/services/entitlements';
import { countOpen } from '@/server/services/suggestions';

/**
 * The office shell: a top bar that belongs to the account, a rail that belongs
 * to the carrier, and a workspace that belongs to the screen. On a desktop the
 * frame is fixed and the workspace scrolls inside it, the way an application
 * behaves; on a phone the whole page scrolls and the rail becomes a row.
 *
 * Everything inside reads the session cookie, so none of it is prerendered.
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
    <div className="flex min-h-screen flex-col md:h-dvh md:overflow-hidden">
      <TopBar companyName={company.name} email={ctx.email} role={roleLabel(ctx.role)} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar
          role={ctx.role}
          companyName={company.name}
          planLabel={planLabel}
          todayCount={openCount}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
