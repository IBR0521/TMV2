import { expect, test } from '@playwright/test';
import { createCarrier, PASSWORD, signUp, uniqueAccount } from './support/accounts';

/**
 * Phase 1, "done when": an owner signs up, invites a dispatcher, and the
 * dispatcher sees exactly 5 menu sections.
 */
test('an owner signs up, invites a dispatcher, and the dispatcher sees five sections', async ({
  browser,
}) => {
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  await createCarrier(ownerPage);

  // The owner sees all nine sections, plus Settings on its own.
  await expect(ownerPage.getByTestId('nav-sections').getByRole('link')).toHaveCount(9);
  await expect(ownerPage.getByTestId('nav-settings').getByRole('link')).toHaveCount(1);

  const dispatcher = uniqueAccount('dispatcher');

  await ownerPage.goto('/settings/team');
  await ownerPage.getByLabel('Email to invite').fill(dispatcher.email);
  await ownerPage.getByLabel('Role').selectOption('dispatcher');
  await ownerPage.getByRole('button', { name: 'Invite' }).click();

  const link = ownerPage.getByTestId('invite-link').first();
  await expect(link).toBeVisible();
  const inviteUrl = (await link.innerText()).trim();
  expect(inviteUrl).toContain('/join/');

  // A second browser, so the dispatcher is genuinely a different session.
  const dispatcherContext = await browser.newContext();
  const dispatcherPage = await dispatcherContext.newPage();

  await signUp(dispatcherPage, dispatcher.email, dispatcher.name);
  await expect(dispatcherPage).toHaveURL(/\/onboarding$/);

  await dispatcherPage.goto(new URL(inviteUrl).pathname);
  await dispatcherPage.getByRole('button', { name: 'Accept invitation' }).click();

  await expect(dispatcherPage).toHaveURL(/\/today$/);
  await expect(dispatcherPage.getByTestId('nav-sections').getByRole('link')).toHaveCount(5);
  await expect(dispatcherPage.getByTestId('nav-sections')).toContainText('Dispatch');
  await expect(dispatcherPage.getByTestId('nav-sections')).not.toContainText('Billing');

  // A hidden section is not reachable by typing its URL either.
  const hidden = await dispatcherPage.goto('/billing');
  expect(hidden?.status()).toBe(404);

  await ownerContext.close();
  await dispatcherContext.close();
});

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL(/\/login\?next=%2Ftoday$/);
});

test('an account with no carrier is sent to set one up', async ({ page }) => {
  const person = uniqueAccount('nobody');
  await signUp(page, person.email, person.name);
  await expect(page).toHaveURL(/\/onboarding$/);
  expect(PASSWORD.length).toBeGreaterThan(8);
});
