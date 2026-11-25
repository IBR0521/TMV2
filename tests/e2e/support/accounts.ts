import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

/** Every run gets its own carrier and people, so runs never collide. */
export const PASSWORD = 'truckmates-e2e-password';

export function uniqueAccount(role: string): { email: string; name: string; tag: string } {
  const tag = randomUUID().slice(0, 8);
  return { email: `${role}-${tag}@e2e.test`, name: `${role} ${tag}`, tag };
}

export async function signUp(page: Page, email: string, name: string): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Signs up an owner and sets its carrier up, landing on Today. */
export async function createCarrier(page: Page, label = 'E2E Freight'): Promise<string> {
  const owner = uniqueAccount('owner');
  await signUp(page, owner.email, owner.name);

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Carrier name').fill(`${label} ${owner.tag}`);
  await page.getByLabel('MC number').fill('MC999999');
  await page.getByRole('button', { name: 'Finish setup' }).click();

  await expect(page).toHaveURL(/\/today$/);
  return owner.email;
}
