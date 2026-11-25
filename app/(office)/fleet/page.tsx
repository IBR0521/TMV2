import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Fleet' };

export default async function Page() {
  await requireSection('fleet');
  return (
    <PlaceholderPage
      title="Fleet"
      subline="Drivers, trucks, trailers and what is due"
      panelTitle="Drivers"
      arrives="Fleet and customers arrive in phase 2."
    />
  );
}
