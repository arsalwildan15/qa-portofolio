import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-31 (!) Edge case
 * Verify login works when credentials are typed character-by-character
 * (pressSequentially) rather than set in one shot via fill() — exercises
 * any keyup/input-event-driven validation the form may have.
 */
test('TC-LOGIN-31: login works with character-by-character input', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.usernameInput.pressSequentially(env.username);
  await loginPage.passwordInput.pressSequentially(env.password);
  await loginPage.loginButton.click();

  await expect(page).toHaveURL(/dashboard\/index/);
});
