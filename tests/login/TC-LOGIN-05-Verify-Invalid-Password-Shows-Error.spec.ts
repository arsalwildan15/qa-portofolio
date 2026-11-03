import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-05 (-) Negative
 * Verify an invalid password shows the "Invalid credentials" error.
 */
test('TC-LOGIN-05: invalid password shows error message', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(env.username, 'wrong-password');

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
});
