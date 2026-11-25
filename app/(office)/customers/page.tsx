import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Customers' };

export default async function Page() {
  await requireSection('customers');
  return (
    <PlaceholderPage
      title="Customers"
      subline="Brokers, shippers and the places freight moves between"
      panelTitle="Customers"
      arrives="Fleet and customers arrive in phase 2."
    />
  );
}
