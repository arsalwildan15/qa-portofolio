import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-25 (S) Security
 * Verify the session is invalidated after logout — navigating directly
 * to the dashboard URL afterwards redirects back to login instead of
 * reusing the stale session.
 */
test('TC-LOGIN-25: session is invalidated after logout', async ({ page, dashboardPage }) => {
  await dashboardPage.logout();

  await page.goto('/web/index.php/dashboard/index');

  await expect(page).toHaveURL(/auth\/login/);
});
