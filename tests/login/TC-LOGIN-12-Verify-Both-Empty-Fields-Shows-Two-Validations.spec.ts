import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-12 (-) Negative
 * Verify submitting with both fields empty shows two "Required" messages
 * and the form is never submitted (client-side validation blocks it).
 */
test('TC-LOGIN-12: empty username and password shows two validation messages', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await loginPage.loginButton.click();

  await expect(loginPage.requiredValidationMessages).toHaveCount(2);
  for (const message of await loginPage.requiredValidationMessages.all()) {
    await expect(message).toHaveText('Required');
  }
  await expect(page).toHaveURL(/auth\/login/);
});
