import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Loads' };

export default async function Page() {
  await requireSection('loads');
  return (
    <PlaceholderPage
      title="Loads"
      subline="Every load with status, driver, rate and profit"
      panelTitle="Loads"
      arrives="Loads and dispatch arrive in phase 3."
    />
  );
}
