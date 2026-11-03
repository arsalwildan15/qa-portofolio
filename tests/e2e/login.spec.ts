import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

test.describe('Login', () => {
  test('valid credentials redirect to dashboard', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(env.username, env.password);
    await expect(page).toHaveURL(/dashboard\/index/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid credentials show error message', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login(env.username, 'wrong-password');
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('empty credentials keep user on login page', async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginButton.click();
    await expect(page).toHaveURL(/auth\/login/);
  });
});
