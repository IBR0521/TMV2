import { Button } from '@/ui/button';
import { SampleNotice } from '@/ui/app-frame';
import { requireSection } from '@/server/guard';
import { SAMPLE_LOADS } from './_sample';
import { LoadsTable } from './loads-table';

export const metadata = { title: 'Loads' };

/**
 * Every load with status, driver, rate and margin — the screen docs/spec/
 * screens.md calls row 2, with "New load" as its primary action.
 *
 * Phase 1 has no loads table, so the rows are the spec's own sample figures and
 * the notice says so. The structure, the views, the sorting, the selection and
 * the detail pane are real, and phase 3 swaps the data underneath.
 */
export default async function LoadsPage() {
  await requireSection('loads');

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3">
        <h1 className="text-page-title">Loads</h1>
        <span className="nums text-body text-text-muted">{SAMPLE_LOADS.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary">Import</Button>
          <Button variant="primary">New load</Button>
        </div>
      </div>

      <SampleNotice phase="phase 3" what="Loads" />
      <LoadsTable />
    </>
  );
}
