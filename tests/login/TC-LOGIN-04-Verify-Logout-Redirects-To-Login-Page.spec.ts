import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-04 (+) Positive
 * Verify logout redirects the user back to the login page, with the
 * logout request itself returning a 302 to /auth/login and the
 * resulting login page being properly served (200).
 */
test('TC-LOGIN-04: logout redirects back to login page', async ({ page, dashboardPage }) => {
  await dashboardPage.userDropdown.click();

  const [logoutResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/logout')),
    dashboardPage.logoutMenuItem.click(),
  ]);

  // [API VERIFICATION]
  expect(logoutResponse.status()).toBe(302);
  expect(logoutResponse.headers()['location']).toContain('/auth/login');

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});
