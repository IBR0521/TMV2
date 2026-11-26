import { expect, test } from '@playwright/test';
import { signUp, uniqueAccount } from './support/accounts';

/**
 * Phase 2, "done when": Playwright covers the setup wizard.
 *
 * docs/spec/flows.md, 1. Signup and setup: an owner goes from the website to a
 * working company, and "every step after the company details can be skipped
 * and finished later from Today".
 *
 * So the two things worth proving are that the whole way through works, and
 * that skipping works and leaves a checklist rather than a hole.
 */
test('an owner walks every step of the wizard and lands on Today', async ({
  page,
}) => {
  const owner = uniqueAccount('wizard');
  await signUp(page, owner.email, owner.name);

  // Step 1: the carrier.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Carrier name').fill(`Wizard Freight ${owner.tag}`);
  await page.getByRole('button', { name: 'Next: your fleet' }).click();

  // Step 2: the fleet.
  await expect(page).toHaveURL(/\/onboarding\/fleet$/);
  await expect(page.getByText('Import a spreadsheet')).toBeVisible();
  await page.getByRole('link', { name: 'Next: customers' }).click();

  // Step 3: the customers.
  await expect(page).toHaveURL(/\/onboarding\/customers$/);
  await page.getByRole('link', { name: 'Next: your team' }).click();

  // Step 4: the team.
  await expect(page).toHaveURL(/\/onboarding\/team$/);
  await expect(page.getByLabel('Email to invite')).toBeVisible();
  await page.getByRole('link', { name: 'Go to Today' }).click();

  await expect(page).toHaveURL(/\/today$/);
});

test('a carrier that skipped every step is told what is left, and can finish it later', async ({
  page,
}) => {
  const owner = uniqueAccount('skipper');
  await signUp(page, owner.email, owner.name);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Carrier name').fill(`Skipper Freight ${owner.tag}`);
  await page.getByRole('button', { name: 'Next: your fleet' }).click();

  await expect(page).toHaveURL(/\/onboarding\/fleet$/);
  await page.getByRole('link', { name: 'Skip the rest of setup' }).click();

  // Today keeps the checklist the flow promises: three things, none of them
  // done, each one a way back into the step that was skipped.
  await expect(page).toHaveURL(/\/today$/);
  const checklist = page.getByRole('region', { name: 'Finish setting up' });
  await expect(checklist).toContainText('Add your trucks and drivers');
  await expect(checklist).toContainText('Add the brokers you haul for');
  await expect(checklist).toContainText('Invite your dispatcher');

  // And it is a way back, not a reminder.
  await checklist.getByRole('link', { name: 'Do it' }).first().click();
  await expect(page).toHaveURL(/\/onboarding\/fleet$/);
});

test('setup is not somewhere a signed-out visitor can wander into', async ({ page }) => {
  await page.goto('/onboarding/fleet');
  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding%2Ffleet$/);
});
