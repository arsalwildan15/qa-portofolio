import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-19 (B) Boundary
 * Verify a 255-character password (upper boundary) does not crash the
 * server and is correctly rejected as invalid.
 */
test('TC-LOGIN-19: password with 255 characters does not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(env.username, 'a'.repeat(255)),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
