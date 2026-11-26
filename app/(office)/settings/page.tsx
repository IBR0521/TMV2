import { Button, ListRow, PageHeader, Panel, PanelHeader } from '@/ui';
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
    <>
      <PageHeader title="Settings" subtitle={`Signed in as ${ctx.email}`} />

      <Panel label="Settings">
        <PanelHeader title="Carrier settings" count={screens.length} />
        {screens.map((screen) => (
          <ListRow
            key={screen.href}
            label={screen.label}
            title={screen.detail}
            action={
              <Button size="sm" href={screen.href}>
                Open
              </Button>
            }
          />
        ))}
      </Panel>
    </>
  );
}
