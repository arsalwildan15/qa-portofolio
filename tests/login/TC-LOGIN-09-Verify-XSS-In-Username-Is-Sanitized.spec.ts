import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-09 (S) Security
 * Verify an XSS payload in the username field is never executed and the
 * raw <script> tag is not rendered as live HTML on the page.
 */
test('TC-LOGIN-09: XSS payload in username is not executed', async ({ page, loginPage }) => {
  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  await loginPage.goto();
  await loginPage.login("<script>alert('xss')</script>", 'admin123');

  expect(dialogFired).toBe(false);
  await expect(page.locator('script:has-text("alert(\'xss\')")')).toHaveCount(0);
  await expect(loginPage.errorMessage).toBeVisible();
});
