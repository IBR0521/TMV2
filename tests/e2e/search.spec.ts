import { expect, test } from '@playwright/test';
import { createCarrier } from './support/accounts';

/**
 * Global search from the box people actually type in.
 *
 * The service has its own tests against the database; this is about the front
 * door: the field in every page header goes somewhere, the results page keeps
 * what was typed, and a hit leads to the record.
 */
test('a dispatcher types a driver’s name in the header and lands on that driver', async ({
  page,
}) => {
  await createCarrier(page);

  // Something to find.
  await page.goto('/fleet/drivers/new');
  await page.getByLabel('Driver name').fill('Henrietta Cobblepot');
  await page.getByLabel('Phone').fill('(214) 555-0199');
  await page.getByRole('button', { name: 'Add driver' }).click();
  await expect(page).toHaveURL(/\/fleet\/drivers\/[0-9a-f-]+$/);

  // The header box on an unrelated screen.
  await page.goto('/today');
  await page.getByLabel('Search').fill('Cobblepot');
  await page.getByLabel('Search').press('Enter');

  await expect(page).toHaveURL(/\/search\?q=Cobblepot$/);

  const results = page.getByRole('region', { name: 'Results' });
  await expect(results).toContainText('Henrietta Cobblepot');
  await expect(results).toContainText('Driver');

  // The box on the results page still holds what was typed, so a near miss
  // can be corrected where the results are.
  await expect(page.getByLabel('Search')).toHaveValue('Cobblepot');

  await results.getByRole('link', { name: 'Open' }).first().click();
  await expect(page).toHaveURL(/\/fleet\/drivers\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'Henrietta Cobblepot' })).toBeVisible();
});

test('searching for something nobody has says so plainly', async ({ page }) => {
  await createCarrier(page);

  await page.goto('/today');
  await page.getByLabel('Search').fill('Nothingwhatsoever');
  await page.getByLabel('Search').press('Enter');

  await expect(page.getByRole('region', { name: 'Results' })).toContainText(
    'Nothing matches “Nothingwhatsoever”',
  );
});
