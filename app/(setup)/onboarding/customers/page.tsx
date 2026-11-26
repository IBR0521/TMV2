import { redirect } from 'next/navigation';
import { Button, FormActions, Notice, Panel, PanelHeader } from '@/ui';
import { getContext } from '@/server/context';
import { Importer } from '../../../(office)/settings/import/importer';
import { Steps } from '../steps';

export const metadata = { title: 'Your customers' };

/**
 * Step four of signup: "Upload a customer list (for example a QuickBooks
 * export), or skip; brokers are also created automatically from the first
 * rate confirmations."
 *
 * That last part is phase 3's, so the notice says so rather than leaving a
 * carrier to think this is their only chance.
 */
export default async function SetupCustomersPage() {
  const ctx = await getContext();
  if (ctx === null) redirect('/onboarding');

  return (
    <>
      <Steps
        current="customers"
        title="Your customers"
        subtitle="Import the brokers and shippers you already work with, or skip."
      />

      <Notice label="Worth knowing">
        Skipping costs nothing: from phase 3 a broker is added on its own the
        first time you read one of their rate confirmations.
      </Notice>

      <Importer />

      <Panel>
        <PanelHeader title="Done with customers?" />
        <FormActions>
          <Button href="/today">Skip the rest of setup</Button>
          <Button variant="primary" href="/onboarding/team">
            Next: your team
          </Button>
        </FormActions>
      </Panel>
    </>
  );
}
