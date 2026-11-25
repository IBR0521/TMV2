import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Invoicing and factoring' };

export default async function Page() {
  await requireSection('settings');
  return (
    <PlaceholderPage
      title="Invoicing and factoring"
      subline="Numbering, terms, invoice layout, factoring companies"
      panelTitle="Invoicing"
      arrives="Invoicing settings arrive in phase 5."
    />
  );
}
