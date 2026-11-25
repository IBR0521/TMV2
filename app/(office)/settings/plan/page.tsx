import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Plan and billing' };

export default async function Page() {
  await requireSection('settings');
  return (
    <PlaceholderPage
      title="Plan and billing"
      subline="Plan, trucks counted, AI quota used, invoices"
      panelTitle="Plan"
      arrives="Paddle checkout arrives in phase 8."
    />
  );
}
