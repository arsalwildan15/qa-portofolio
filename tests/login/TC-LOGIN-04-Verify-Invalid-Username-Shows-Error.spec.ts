import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-04 (-) Negative
 * Verify an invalid username shows the "Invalid credentials" error.
 */
test('TC-LOGIN-04: invalid username shows error message', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.login('InvalidUser', env.password);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  await expect(page).toHaveURL(/auth\/login/);
});
