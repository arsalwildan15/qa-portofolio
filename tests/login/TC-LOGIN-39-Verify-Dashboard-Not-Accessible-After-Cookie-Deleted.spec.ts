import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-39 (!) Edge case
 * Verify the dashboard is not accessible after the session cookie is
 * deleted client-side (simulating cookie expiry/tampering) — no
 * dashboard data should leak before the redirect happens.
 */
test('TC-LOGIN-39: dashboard not accessible after session cookie is deleted', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto('/web/index.php/dashboard/index');

  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
});
