import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Automation' };

export default async function Page() {
  await requireSection('settings');
  return (
    <PlaceholderPage
      title="Automation"
      subline="Each rule set to auto, suggest or off"
      panelTitle="Rules"
      arrives="Choosing rule modes arrives in phase 3."
    />
  );
}
