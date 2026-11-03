import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-13 (!) Edge case (reclassified from Negative — see finding below)
 *
 * [TEMUAN] Original assumption was that username is case-sensitive. Live
 * verification against this OrangeHRM 5.9 instance shows the opposite:
 * "admin" (lowercase) successfully authenticates for the "Admin" account.
 * This test documents the ACTUAL behavior rather than the wrong assumption.
 */
test('TC-LOGIN-13: username is case-insensitive (documented finding)', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await loginPage.login(env.username.toLowerCase(), env.password);

  await expect(page).toHaveURL(/dashboard\/index/);
});
