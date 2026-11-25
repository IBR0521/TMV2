import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Reports' };

export default async function Page() {
  await requireSection('reports');
  return (
    <PlaceholderPage
      title="Reports"
      subline="Profit per load, truck, driver and lane"
      panelTitle="Reports"
      arrives="Reports arrive in phase 7."
    />
  );
}
