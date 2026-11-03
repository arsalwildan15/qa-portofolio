import { test, expect } from '../../src/fixtures/pages.fixture';

/**
 * TC-LOGIN-37 (!) Edge case
 * Verify 5 consecutive failed login attempts are each handled normally
 * (302 to /auth/login, no crash). This is a portfolio-documentation TC:
 * the public demo is not expected to rate-limit, but the test asserts
 * the one thing that must always hold — no 5xx under repeated failure —
 * and logs whether throttling behavior (429 / Retry-After) appears.
 */
test('TC-LOGIN-37: rapid repeated failed logins do not crash the server', async ({
  page,
  loginPage,
}) => {
  await loginPage.goto();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await loginPage.usernameInput.fill('wronguser');
    await loginPage.passwordInput.fill('wrongpass');

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/auth/validate')),
      loginPage.loginButton.click(),
    ]);

    expect(response.status()).toBeLessThan(500);
    if (response.status() === 429) {
      console.log(`Attempt ${attempt}: rate-limited (429) — Retry-After=`, response.headers()['retry-after']);
    }
    await expect(loginPage.errorMessage).toBeVisible();
  }
});
