import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-05 (+) Positive
 * Verify the password input is masked (type="password") and stays masked
 * after typing.
 */
test('TC-LOGIN-05: password input is masked', async ({ loginPage }) => {
  await loginPage.goto();

  await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  await loginPage.passwordInput.fill('admin123');
  await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
});
