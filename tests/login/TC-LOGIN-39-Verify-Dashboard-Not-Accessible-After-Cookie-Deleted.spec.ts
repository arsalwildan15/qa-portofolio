import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-39 (!) Edge case
 * Verify the dashboard is not accessible after the session cookie is
 * deleted client-side (simulating cookie expiry/tampering) — the server
 * itself rejects the request (302), not just a client-side redirect, so
 * no dashboard data can leak before the redirect happens.
 */
test('TC-LOGIN-39: dashboard not accessible after session cookie is deleted', async ({
  page,
  context,
}) => {
  await context.clearCookies();

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
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
});
