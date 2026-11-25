import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Billing' };

export default async function Page() {
  await requireSection('billing');
  return (
    <PlaceholderPage
      title="Billing"
      subline="Invoices, payments and factoring"
      panelTitle="Invoices"
      arrives="Invoicing and factoring arrive in phase 5."
    />
  );
}
