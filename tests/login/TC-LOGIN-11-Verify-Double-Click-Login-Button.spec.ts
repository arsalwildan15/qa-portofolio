import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-11 (!) Edge case
 * Verify double-clicking the Login button does not submit the form twice
 * (no duplicate POST /auth/validate requests).
 */
test('TC-LOGIN-11: double click on Login button does not submit twice', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);
  await loginPage.passwordInput.fill(env.password);

  let submitCount = 0;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate') && req.method() === 'POST') {
      submitCount += 1;
    }
  });

  await loginPage.loginButton.dblclick();
  await page.waitForURL(/dashboard\/index/);

  expect(submitCount).toBe(1);
});
