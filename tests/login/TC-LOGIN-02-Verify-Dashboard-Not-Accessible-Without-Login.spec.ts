import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-02 (+) Positive
 * Verify the dashboard redirects to login when accessed directly without
 * an authenticated session, and that the resulting login page is actually
 * served (GET /auth/login → 200), not an error page.
 */
test('TC-LOGIN-02: dashboard redirects to login when not authenticated', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/login') && res.request().method() === 'GET'),
    page.goto('/web/index.php/dashboard/index'),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(200);

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
