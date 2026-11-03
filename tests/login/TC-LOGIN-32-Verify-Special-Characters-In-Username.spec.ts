import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-32 (!) Edge case
 * Verify a username made entirely of special/punctuation characters does
 * not crash the server and is handled gracefully.
 */
test('TC-LOGIN-32: special characters in username do not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('Admin@#$%^&*()', env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
