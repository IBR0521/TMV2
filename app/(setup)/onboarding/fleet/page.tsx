import { redirect } from 'next/navigation';
import { Button, FormActions, Panel, PanelHeader } from '@/ui';
import { getContext } from '@/server/context';
import { Importer } from '../../../(office)/settings/import/importer';
import { Steps } from '../steps';

export const metadata = { title: 'Your fleet' };

/**
 * Step three of signup (docs/spec/flows.md): "Upload a spreadsheet of trucks
 * and drivers, or type a few rows."
 *
 * The same importer the Settings screen uses — there is one way to read a
 * spreadsheet, and a carrier who skips this step and imports later should get
 * exactly the same thing. Skipping is a link, not a dead end: Today keeps a
 * checklist of whatever was left.
 */
export default async function SetupFleetPage() {
  const ctx = await getContext();
  if (ctx === null) redirect('/onboarding');

  return (
    <>
      <Steps
        current="fleet"
        title="Your fleet"
        subtitle="Import your trucks and your drivers, or skip and add them later."
      />

      <Importer />

      <Panel>
        <PanelHeader title="Done with the fleet?" />
        <FormActions>
          <Button href="/today">Skip the rest of setup</Button>
          <Button variant="primary" href="/onboarding/customers">
            Next: customers
          </Button>
        </FormActions>
      </Panel>
    </>
  );
}
