import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-08 (S) Security
 * Verify a classic SQL injection payload in the username field does not
 * bypass authentication and does not leak a database error to the client.
 */
test('TC-LOGIN-08: SQL injection payload in username is rejected', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();
  await loginPage.login("' OR '1'='1", 'anything');

  await expect(page).toHaveURL(/auth\/login/);
  await expect(loginPage.errorMessage).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText.toLowerCase()).not.toContain('sql');
  expect(bodyText.toLowerCase()).not.toContain('syntax error');
});
