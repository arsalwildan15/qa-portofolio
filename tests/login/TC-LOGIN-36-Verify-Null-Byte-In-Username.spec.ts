import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-36 (!) Edge case
 * Verify a null byte embedded in the username does not bypass auth and
 * does not crash the server (classic null-byte injection probe).
 */
test('TC-LOGIN-36: null byte in username does not bypass auth', async ({ page, loginPage }) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(`${env.username}\u0000`, env.password),
  ]);

  expect(response.status()).toBeLessThan(500);
  expect(response.headers()['location']).toContain('/auth/login');
});
