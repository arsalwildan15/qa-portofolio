import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-09 (-) Negative
 * Verify both an invalid username and password together show the same
 * generic "Invalid credentials" error (no field-specific leak).
 */
test('TC-LOGIN-09: both invalid username and password shows error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('wronguser', 'wrongpass');

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
});
