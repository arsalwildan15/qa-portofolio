import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-26 (S) Security
 * Verify a protected URL (PIM module) cannot be accessed after logout —
 * no employee data should be exposed to a logged-out session.
 */
test('TC-LOGIN-26: protected URL redirects to login after logout', async ({
  page,
  dashboardPage,
}) => {
  await dashboardPage.logout();

  await page.goto('/web/index.php/pim/viewPimModule');

  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByText('Employee Information')).toHaveCount(0);
});
