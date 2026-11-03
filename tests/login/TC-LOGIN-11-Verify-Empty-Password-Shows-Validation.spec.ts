import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-11 (-) Negative
 * Verify leaving Password empty shows a single "Required" validation
 * message and the form is never submitted.
 */
test('TC-LOGIN-11: empty password shows required validation', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.usernameInput.fill(env.username);

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/validate')) submitted = true;
  });
  await loginPage.loginButton.click();

  await expect(loginPage.requiredValidationMessages).toHaveCount(1);
  await expect(loginPage.requiredValidationMessages.first()).toHaveText('Required');
  expect(submitted).toBe(false);
});
