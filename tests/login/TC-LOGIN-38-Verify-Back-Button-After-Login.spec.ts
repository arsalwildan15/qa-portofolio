import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-38 (!) Edge case
 * Verify using the browser Back button after logging in does not expose
 * stale login-page state or break the session — behavior should stay
 * consistent (either dashboard stays, or a clean redirect to login).
 */
test('TC-LOGIN-38: browser back button after login stays consistent', async ({ page }) => {
  await page.goBack();

  const url = page.url();
  const onDashboard = /dashboard\/index/.test(url);
  const onLogin = /auth\/login/.test(url);

  expect(onDashboard || onLogin).toBe(true);
  await expect(page.locator('body')).toBeVisible();
});
