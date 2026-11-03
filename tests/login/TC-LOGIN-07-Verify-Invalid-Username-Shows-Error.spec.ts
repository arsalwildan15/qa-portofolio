import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-07 (-) Negative
 * Verify an invalid username is rejected at the API level (302 back to
 * /auth/login, no session cookie issued) and shows the generic
 * "Invalid credentials" error in the UI.
 */
test('TC-LOGIN-07: invalid username shows error message', async ({ page, loginPage }) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('InvalidUser', env.password),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toContain('/auth/login');
  const setCookieHeaders = (await response.headersArray()).filter(
    (h) => h.name.toLowerCase() === 'set-cookie',
  );
  expect(setCookieHeaders).toHaveLength(0);

  // [UI VERIFICATION]
  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  await expect(page).toHaveURL(/auth\/login/);
});
