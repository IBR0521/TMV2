import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Page } from '@/ui/app-frame';
import { PageHeader } from '@/ui/page-header';
import { Panel, PanelRow } from '@/ui/panel';
import { ICON_STROKE } from '@/ui/icons';
import { canManageTeam } from '@/domain/roles';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Settings' };

const SCREENS = [
  { href: '/settings/company', label: 'Company', detail: 'Name, MC and DOT, time zone', ownerOnly: false },
  { href: '/settings/team', label: 'Users and roles', detail: 'Invite people, change roles', ownerOnly: true },
  { href: '/settings/automation', label: 'Automation', detail: 'Each rule set to auto, suggest or off', ownerOnly: false },
  { href: '/settings/invoicing', label: 'Invoicing and factoring', detail: 'Numbering, terms, factoring companies', ownerOnly: false },
  { href: '/settings/plan', label: 'Plan and billing', detail: 'Plan, trucks counted, AI quota used', ownerOnly: false },
  { href: '/settings/import', label: 'Import and export', detail: 'Spreadsheet import, CSV exports', ownerOnly: false },
];

export default async function SettingsPage() {
  const ctx = await requireSection('settings');
  const screens = SCREENS.filter((screen) => !screen.ownerOnly || canManageTeam(ctx.role));

  return (
    <Page>
      <div className="space-y-6">
      <PageHeader title="Settings" subline={`Signed in as ${ctx.email}`} />
      <Panel>
        {screens.map((screen) => (
          <PanelRow key={screen.href}>
            <div className="min-w-0">
              <Link href={screen.href} className="text-body-strong hover:text-link">
                {screen.label}
              </Link>
              <p className="text-label text-text-muted">{screen.detail}</p>
            </div>
            <ChevronRight size={16} strokeWidth={ICON_STROKE} className="text-text-muted" aria-hidden />
          </PanelRow>
        ))}
      </Panel>
      </div>
    </Page>
  );
}
