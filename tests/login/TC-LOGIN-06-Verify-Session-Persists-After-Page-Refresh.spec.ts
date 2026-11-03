import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-06 (+) Positive
 * Verify the authenticated session persists after a page refresh — the
 * user stays on the dashboard instead of being bounced to login.
 */
test('TC-LOGIN-06: session persists after page refresh', async ({ page }) => {
  await page.reload();

  await expect(page).toHaveURL(/dashboard\/index/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
