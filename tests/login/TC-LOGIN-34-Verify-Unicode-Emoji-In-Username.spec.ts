import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-34 (!) Edge case
 * Verify a username containing emoji/unicode characters does not crash
 * the server and submits normally (emoji does not block the form).
 */
test('TC-LOGIN-34: unicode and emoji in username do not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('Admin😀🔥', env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
