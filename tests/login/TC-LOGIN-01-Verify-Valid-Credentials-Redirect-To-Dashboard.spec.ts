import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-01 (+) Positive
 * Verify valid credentials redirect to the dashboard.
 */
test('TC-LOGIN-01: valid credentials redirect to dashboard', async ({
  page,
  loginPage,
  dashboardPage,
}) => {
  await loginPage.goto();
  await loginPage.login(env.username, env.password);

  await expect(page).toHaveURL(/dashboard\/index/);
  await expect(dashboardPage.heading).toBeVisible();
});
