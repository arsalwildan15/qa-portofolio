import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-04 (+) Positive
 * Verify logout redirects the user back to the login page.
 */
test('TC-LOGIN-04: logout redirects back to login page', async ({ page, dashboardPage }) => {
  await dashboardPage.logout();

  await expect(page).toHaveURL(/auth\/login/);
});
