import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-25 (S) Security
 * Verify the session is invalidated after logout — GET /dashboard/index
 * afterwards returns 302 (redirect to login), NOT the 200 it returns for
 * an active session (contrast with TC-LOGIN-06).
 */
test('TC-LOGIN-25: session is invalidated after logout', async ({ page, dashboardPage }) => {
  await dashboardPage.logout();
  await page.waitForURL(/auth\/login/);

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/dashboard/index') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/dashboard/index'),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(302);

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/auth\/login/);
});
