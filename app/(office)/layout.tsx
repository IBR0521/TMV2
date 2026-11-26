import { redirect } from 'next/navigation';
import { trialLabel } from '@/domain/trial';
import { isOfficeRole } from '@/domain/roles';
import { Sidebar } from '@/ui/sidebar';
import { getContext } from '@/server/context';
import { getCompany } from '@/server/services/companies';
import { getEntitlements } from '@/server/services/entitlements';
import { countOpen } from '@/server/services/suggestions';

/**
 * The office shell: the sidebar from the approved mockup and a content area
 * padded 28px by 36px, with 24px between sections.
 *
 * Everything inside is dynamic (it reads the session cookie), so none of it is
 * prerendered at build time.
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        role={ctx.role}
        companyName={company.name}
        planLabel={planLabel}
        todayCount={openCount}
      />
      <main className="min-w-0 flex-1 px-5 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
