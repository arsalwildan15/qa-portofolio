import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-10 (!) Edge case
 * Verify the login form can be submitted by pressing Enter in the
 * password field, without clicking the Login button.
 */
test('TC-LOGIN-10: login can be submitted via Enter key', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.submitViaEnterKey(env.username, env.password);

  await expect(page).toHaveURL(/dashboard\/index/);
});
