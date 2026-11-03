import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-17 (B) Boundary
 * Verify a 255-character username (upper boundary) is accepted by the
 * form and handled gracefully by the server (no crash, no 5xx).
 */
test('TC-LOGIN-17: username with 255 characters does not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('a'.repeat(255), env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
