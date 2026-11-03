import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-03 (+) Positive
 * Verify the login page renders all required elements.
 */
test('TC-LOGIN-03: login page renders all required elements', async ({ page, loginPage }) => {
  await loginPage.goto();

  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  await expect(loginPage.usernameInput).toBeVisible();
  await expect(loginPage.usernameInput).toBeEnabled();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeEnabled();
  await expect(loginPage.loginButton).toBeVisible();
  await expect(loginPage.loginButton).toBeEnabled();
  await expect(loginPage.forgotPasswordLink).toBeVisible();
  await expect(loginPage.credentialHintBox).toBeVisible();
});
