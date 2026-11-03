import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-03 (+) Positive
 * Verify the login page renders all required elements, and that the
 * underlying GET /auth/login response is a proper 200 HTML document.
 */
test('TC-LOGIN-03: login page renders all required elements', async ({ page, loginPage }) => {
  const response = await page.goto('/web/index.php/auth/login');

  // [API VERIFICATION]
  expect(response?.status()).toBe(200);
  expect(response?.headers()['content-type']).toContain('text/html');

  // [UI VERIFICATION]
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
