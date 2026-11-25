import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Import and export' };

export default async function Page() {
  await requireSection('settings');
  return (
    <PlaceholderPage
      title="Import and export"
      subline="Spreadsheet import, CSV and QuickBooks exports"
      panelTitle="Import"
      arrives="Import and export arrive in phase 2."
    />
  );
}
