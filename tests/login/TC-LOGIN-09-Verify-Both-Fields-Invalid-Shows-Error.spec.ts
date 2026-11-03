import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-09 (-) Negative
 * Verify both an invalid username and password together are rejected at
 * the API level the same way as a single invalid field (302 to
 * /auth/login), and the UI shows the same generic error — no field-
 * specific information is leaked either way.
 */
test('TC-LOGIN-09: both invalid username and password shows error', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('wronguser', 'wrongpass'),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toContain('/auth/login');

  // [UI VERIFICATION]
  await expect(loginPage.errorMessage).toBeVisible();
  await expect(loginPage.errorMessage).toContainText('Invalid credentials');
});
