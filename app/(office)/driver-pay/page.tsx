import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Driver pay' };

export default async function Page() {
  await requireSection('driver-pay');
  return (
    <PlaceholderPage
      title="Driver pay"
      subline="Settlements for each pay period"
      panelTitle="Settlements"
      arrives="Settlements arrive in phase 6."
    />
  );
}
