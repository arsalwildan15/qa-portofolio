import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-18 (B) Boundary
 * Verify a 256-character username (one over the 255 boundary explored in
 * TC-LOGIN-17) is still handled gracefully — the input has no client-side
 * maxlength, so this exercises the server, not the browser.
 */
test('TC-LOGIN-18: username with 256 characters does not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await expect(loginPage.usernameInput).not.toHaveAttribute('maxlength', /.+/);

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('a'.repeat(256), env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
