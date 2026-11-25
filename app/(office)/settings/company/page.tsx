import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Company' };

export default async function Page() {
  await requireSection('settings');
  return (
    <PlaceholderPage
      title="Company"
      subline="Name, MC and DOT, time zone"
      panelTitle="Carrier details"
      arrives="Editing company details arrives in phase 2."
    />
  );
}
