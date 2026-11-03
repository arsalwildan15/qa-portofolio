import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-02 (+) Positive
 * Verify the dashboard redirects to login when accessed directly without
 * an authenticated session.
 */
test('TC-LOGIN-02: dashboard redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/web/index.php/dashboard/index');

  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
