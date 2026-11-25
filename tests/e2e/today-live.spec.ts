import { expect, test } from '@playwright/test';
import { createCarrier } from './support/accounts';

/**
 * Phase 1, "done when": a test event becomes a suggestion that appears on
 * Today without a page refresh.
 *
 * The whole pipe is under test here: the insert fires a trigger that writes the
 * events row and queues the job in one transaction, the worker runs the rule,
 * the rule's suggestion is upserted, and Supabase Realtime brings it to this
 * page. The marker on window proves the page was never reloaded.
 */
test('a test event becomes a card on Today, live', async ({ page }) => {
  await createCarrier(page);

  await expect(page.getByText('Nothing needs you')).toBeVisible();

  // If the page reloads, this marker goes with it.
  await page.evaluate(() => {
    (window as unknown as { __notReloaded?: boolean }).__notReloaded = true;
  });

  await page.getByTestId('send-test-event').click();

  await expect(page.getByTestId('suggestion')).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByTestId('suggestion').first()).toContainText('A test event arrived');
  await expect(page.getByTestId('suggestion').first()).toContainText('Test event');

  const marker = await page.evaluate(
    () => (window as unknown as { __notReloaded?: boolean }).__notReloaded === true,
  );
  expect(marker, 'the card arrived by a page reload, not over Realtime').toBe(true);

  // Accepting it is the primary button on this screen, and it resolves the card.
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText('Nothing needs you')).toBeVisible({ timeout: 30_000 });
});
