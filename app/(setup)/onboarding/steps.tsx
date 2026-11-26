import { PageHeader, Tabs } from '@/ui';

/**
 * Where the owner is in setting up (docs/spec/flows.md, 1. Signup and setup).
 *
 * The steps are links, not a wizard that traps you: every step after the
 * company may be skipped, and a skipped one is still reachable from the
 * checklist on Today. So the header shows where you are without pretending
 * the order is compulsory.
 */
export const SETUP_STEPS = [
  { key: 'company', label: 'Carrier', href: '/onboarding' },
  { key: 'fleet', label: 'Fleet', href: '/onboarding/fleet' },
  { key: 'customers', label: 'Customers', href: '/onboarding/customers' },
  { key: 'team', label: 'Team', href: '/onboarding/team' },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]['key'];

export function Steps({
  current,
  title,
  subtitle,
}: {
  current: SetupStep;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Tabs
        items={SETUP_STEPS.map((step) => ({
          label: step.label,
          // Nothing ahead of the company step is reachable until it exists;
          // those pages redirect back if somebody tries.
          href: step.href,
          active: step.key === current,
        }))}
      />
    </>
  );
}
