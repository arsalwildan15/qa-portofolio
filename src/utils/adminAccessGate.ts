import { type Page } from '@playwright/test';
import { env } from '../config/env';

/**
 * Maintenance pages (Purge Records, Access Records) first show an "Administrator Access" prompt
 * that asks for the Admin password again (confirmed live 2026-11-15). Every page-level sweep must
 * pass it, or it ends up measuring the prompt instead of the Maintenance page itself.
 */
export async function passAdminAccessGate(page: Page): Promise<boolean> {
  const prompt = page.getByText('Administrator Access');
  if (!(await prompt.isVisible().catch(() => false))) return false;
  await page.locator('input[type="password"]').fill(env.password);
  await page.getByRole('button', { name: 'Confirm' }).click();
  // networkidle arrives BEFORE the SPA renders the target page (seen live: 24-node blank DOM right
  // after Confirm, full 212-node page a few seconds later) -- wait for the real page chrome instead.
  await prompt.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
  await page.locator('.oxd-layout-context').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
  await page.locator('.oxd-main-menu-item').first().waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
  return true;
}
