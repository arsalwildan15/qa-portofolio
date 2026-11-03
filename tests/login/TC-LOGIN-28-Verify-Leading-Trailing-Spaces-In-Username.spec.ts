import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-28 (!) Edge case
 * Verify a username with leading/trailing spaces around an otherwise
 * valid value is NOT trimmed by the client — it is sent as-is and
 * rejected as invalid (confirmed via network payload inspection).
 */
test('TC-LOGIN-28: username with leading/trailing spaces is not trimmed', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(`  ${env.username}  `, env.password),
  ]);

  expect(response.headers()['location']).toContain('/auth/login');
  await expect(loginPage.errorMessage).toBeVisible();
});
