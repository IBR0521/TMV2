import { expect, test } from '@playwright/test';
import { signUp, uniqueAccount } from './support/accounts';

/**
 * Phase 2's headline "done when": a sample CSV of 20 trucks and 20 drivers
 * imports in under 15 minutes from a fresh signup, including the setup wizard.
 *
 * Fifteen minutes is a person's time, not a machine's, so what is actually
 * checked is that one person can do it in one sitting without leaving the
 * flow: sign up, name the carrier, import the trucks, import the drivers, and
 * find all forty on the fleet screens. The clock is only there to catch
 * something going badly wrong.
 */
function trucksCsv(): string {
  const lines = ['Unit #,VIN,Plate,Odometer'];
  for (let i = 1; i <= 20; i++) {
    const unit = 600 + i;
    const vin = `1FUJGBDV8CLB${String(10_000 + i)}`;
    lines.push(`${unit},${vin},TX 6R0${unit},"${(200_000 + i * 311).toLocaleString('en-US')}"`);
  }
  return lines.join('\r\n') + '\r\n';
}

function driversCsv(): string {
  const lines = ['Driver Name,Cell,Type,Home'];
  const towns = ['Laredo, TX', 'Tulsa, OK', 'Memphis, TN', 'Mobile, AL'];
  for (let i = 1; i <= 20; i++) {
    const phone = `(214) 555-${String(1000 + i).slice(-4)}`;
    const type = i % 5 === 0 ? 'Owner Operator' : 'Company';
    lines.push(`Import Driver ${i},${phone},${type},"${towns[i % towns.length]}"`);
  }
  return lines.join('\r\n') + '\r\n';
}

test('a new carrier imports twenty trucks and twenty drivers in one sitting', async ({ page }) => {
  const started = Date.now();
  const owner = uniqueAccount('importer');

  await signUp(page, owner.email, owner.name);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Carrier name').fill(`Import Freight ${owner.tag}`);
  await page.getByRole('button', { name: 'Next: your fleet' }).click();

  await expect(page).toHaveURL(/\/onboarding\/fleet$/);

  // The trucks.
  await page.getByLabel('What is in the file').selectOption('trucks');
  await page.getByLabel('Spreadsheet to import').setInputFiles({
    name: 'trucks.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(trucksCsv()),
  });

  await expect(page.getByRole('region', { name: 'Preview' })).toContainText('20 ready');
  await page.getByRole('button', { name: /^Import 20 trucks$/ }).click();
  await expect(page.getByRole('region', { name: 'Imported' })).toContainText('20 rows added');

  // The drivers, from a sheet whose headings nobody agreed on.
  await page.getByLabel('What is in the file').selectOption('drivers');
  await page.getByLabel('Spreadsheet to import').setInputFiles({
    name: 'drivers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(driversCsv()),
  });

  await expect(page.getByRole('region', { name: 'Preview' })).toContainText('20 ready');
  await page.getByRole('button', { name: /^Import 20 drivers$/ }).click();
  await expect(page.getByRole('region', { name: 'Imported' })).toContainText('20 rows added');

  // All forty are there, and the fleet screens agree.
  await page.goto('/fleet');
  await expect(page.getByRole('region', { name: 'Drivers' })).toContainText('Import Driver 1');
  await expect(page.getByText('20 drivers')).toBeVisible();

  await page.goto('/fleet/units');
  await expect(page.getByText('20 trucks · 0 trailers')).toBeVisible();

  // Nothing here should take anywhere near a person's fifteen minutes.
  expect(Date.now() - started).toBeLessThan(5 * 60_000);
});
