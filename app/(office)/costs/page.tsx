import { PlaceholderPage } from '@/ui/placeholder-page';
import { requireSection } from '@/server/guard';

export const metadata = { title: 'Costs' };

export default async function Page() {
  await requireSection('costs');
  return (
    <PlaceholderPage
      title="Costs"
      subline="Expenses, fuel and IFTA"
      panelTitle="Expenses"
      arrives="Costs and IFTA arrive in phase 7."
    />
  );
}
