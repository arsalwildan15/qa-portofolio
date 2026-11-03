import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-22 (S) Security
 * Verify a SQL injection payload in the password field does not bypass
 * authentication.
 */
test('TC-LOGIN-22: SQL injection payload in password is rejected', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await loginPage.login(env.username, "' OR '1'='1' --");

  await expect(page).toHaveURL(/auth\/login/);
  await expect(loginPage.errorMessage).toBeVisible();
});
