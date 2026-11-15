import { type Browser, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Opens a brand-new, fully isolated browser context (separate cookies/session from whatever
 * `page` the calling test already has) and logs in as the given credentials. Lets a single test
 * drive two logged-in identities at once (e.g. Admin + a freshly-created ESS account) -- same
 * pattern already proven in TC-CLAIM-ASSIGN-13's concurrent-cancel race-condition test, lifted
 * out into a reusable helper since Phase 2's approval-flow TCs need it repeatedly.
 */
export async function loginAs(
  browser: Browser,
  username: string,
  password: string,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(username, password);
  await page.waitForURL('**/dashboard/index', { timeout: 20_000 });
  return { page, close: () => context.close() };
}
