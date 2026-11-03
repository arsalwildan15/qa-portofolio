import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-35 (!) Edge case
 * Verify right-to-left (Arabic) characters in the username are encoded
 * and submitted correctly (UTF-8) without crashing the server.
 */
test('TC-LOGIN-35: RTL Arabic characters in username do not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('مستخدم', env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
