import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-40 (!) Edge case
 * Verify "Forgot your password?" navigates to the password reset request
 * page.
 */
test('TC-LOGIN-40: "Forgot your password?" link is functional', async ({ page, loginPage }) => {
  await loginPage.goto();
  await loginPage.forgotPasswordLink.click();

  await expect(page).toHaveURL(/auth\/requestPasswordResetCode/);
  await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
});
