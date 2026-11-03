import { authenticatedTest as test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-06 (+) Positive
 * Verify the authenticated session persists after a page refresh — the
 * GET /dashboard/index request on reload returns 200 (not a redirect to
 * login), and the dashboard stays visible.
 */
test('TC-LOGIN-06: session persists after page refresh', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/dashboard/index') && res.request().method() === 'GET',
    ),
    page.reload(),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(200);

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/dashboard\/index/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
