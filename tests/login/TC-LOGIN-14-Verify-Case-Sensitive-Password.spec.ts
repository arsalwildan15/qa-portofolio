import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-14 (-) Negative
 * Verify the password is case-sensitive — flipping the case of the first
 * character must be rejected.
 */
test('TC-LOGIN-14: password is case-sensitive', async ({ loginPage }) => {
  const flippedCasePassword =
    env.password.charAt(0).toUpperCase() + env.password.slice(1);

  await loginPage.goto();
  await loginPage.login(env.username, flippedCasePassword);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
});
