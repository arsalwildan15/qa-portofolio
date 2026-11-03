import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-20 (B) Boundary
 * Verify a single-character username (minimum non-empty boundary) is
 * accepted by the form and correctly rejected as invalid.
 */
test('TC-LOGIN-20: single character username is handled correctly', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('A', env.password);

  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
});
