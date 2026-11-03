import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-24 (S) Security
 * Verify an XSS payload in the password field (img onerror variant) is
 * never executed.
 */
test('TC-LOGIN-24: XSS payload in password is not executed', async ({ page, loginPage }) => {
  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  await loginPage.goto();
  await loginPage.login(env.username, '<img src=x onerror=alert(1)>');

  expect(dialogFired).toBe(false);
  await expect(page.locator('body')).toBeVisible();
});
