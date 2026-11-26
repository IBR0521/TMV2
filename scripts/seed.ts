/**
 * Two demo carriers with a person in every role, so that development and the
 * RLS tests always have two tenants to prove isolation against.
 *
 * Local databases only: it refuses to run against anything that is not
 * 127.0.0.1 or localhost.
 *
 *   pnpm db:start && pnpm db:env && pnpm db:seed
 */
import { config as loadEnv } from 'dotenv';
import { clients, isLocal, provision, type DemoCompany } from './lib/provision';

loadEnv({ path: ['.env.local', '.env'] });

const PASSWORD = 'truckmates-demo';

const COMPANIES: DemoCompany[] = [
  {
    name: 'Alpha Freight',
    mcNumber: 'MC123456',
    dotNumber: '1000001',
    timezone: 'America/Chicago',
    people: [
      { name: 'Ann Alvarez', email: 'owner@alpha.test', role: 'owner' },
      { name: 'Dan Dixon', email: 'dispatcher@alpha.test', role: 'dispatcher' },
      { name: 'Amy Chen', email: 'accounting@alpha.test', role: 'accounting' },
      { name: 'Dee Baker', email: 'driver@alpha.test', role: 'driver' },
    ],
  },
  {
    name: 'Beta Logistics',
    mcNumber: 'MC654321',
    dotNumber: '2000002',
    timezone: 'America/New_York',
    people: [
      { name: 'Ben Brooks', email: 'owner@beta.test', role: 'owner' },
      { name: 'Dana Ortiz', email: 'dispatcher@beta.test', role: 'dispatcher' },
      { name: 'Alan Reed', email: 'accounting@beta.test', role: 'accounting' },
      { name: 'Dom Price', email: 'driver@beta.test', role: 'driver' },
    ],
  },
];

async function main(): Promise<void> {
  const c = clients();

  if (!isLocal(c.url)) {
    console.error(`seed: refusing to touch ${c.url}. The seed is for local databases only.`);
    process.exit(1);
  }

  for (const company of COMPANIES) {
    const { companyId, created } = await provision(c, company, PASSWORD);
    console.log(
      `seed: ${created ? 'created' : 'already there'} ${company.name} (${companyId}) ` +
        `with ${company.people.length} people`,
    );
  }

  console.log(`seed: every demo account uses the password "${PASSWORD}"`);
}

main().catch((error: unknown) => {
  console.error('seed: failed', error);
  process.exit(1);
});
