import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-26 (S) Security
 * Verify a protected URL (PIM module) cannot be accessed after logout —
 * the server itself redirects (302), not just the client UI, so no
 * employee data can leak via a cached response or direct API call.
 */
test('TC-LOGIN-26: protected URL redirects to login after logout', async ({
  page,
  dashboardPage,
}) => {
  await dashboardPage.logout();
  await page.waitForURL(/auth\/login/);

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/pim/viewPimModule') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/pim/viewPimModule'),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(302);

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByText('Employee Information')).toHaveCount(0);
});
