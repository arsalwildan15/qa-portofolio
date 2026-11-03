import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-27 (S) Security
 * Verify an HTML injection payload in the username is not rendered as a
 * live DOM element — it must stay inert text, never an actual heading.
 */
test('TC-LOGIN-27: HTML injection in username is not rendered', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login('<h1>Hacked</h1>', 'admin123');

  await expect(page.getByRole('heading', { name: 'Hacked' })).toHaveCount(0);
  await expect(loginPage.errorMessage).toBeVisible();
});
