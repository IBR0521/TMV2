import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Dispatch' };

export default async function Page() {
  await requireSection('dispatch');
  return (
    <PlaceholderPage
      title="Dispatch"
      subline="Trucks and drivers by day: free, loaded, late"
      panelTitle="Dispatch board"
      arrives="The dispatch board arrives in phase 3."
    />
  );
}
