import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-33 (!) Edge case
 * Verify an extremely long password (1000 characters) is received within
 * a reasonable time and does not crash or hang the server.
 */
test('TC-LOGIN-33: extremely long password does not freeze or crash', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate'), { timeout: 10000 }),
    loginPage.login(env.username, 'a'.repeat(1000)),
  ]);

  expect(response.status()).toBeLessThan(500);
  await expect(loginPage.errorMessage).toBeVisible();
});
