import { PageHeader } from '@/ui';
import { requireSection } from '@/server/guard';
import { Importer } from './importer';

export const metadata = { title: 'Import and export' };

/**
 * Import and export (docs/spec/screens.md, row 29). Phase 2 builds the import
 * half: trucks, drivers and customers from a carrier's own spreadsheet.
 * Exports — CSV and QuickBooks — need invoices and settlements, so they come
 * with phases 5 and 6.
 */
export default async function ImportPage() {
  await requireSection('settings');

  return (
    <>
      <PageHeader
        title="Import"
        subtitle="Bring trucks, drivers and customers in from a spreadsheet you already have."
      />

      <Importer />
    </>
  );
}
