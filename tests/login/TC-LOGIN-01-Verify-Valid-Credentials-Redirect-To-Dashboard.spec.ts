import { test, expect } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';

/**
 * TC-LOGIN-01 (+) Positive
 * Verify valid credentials redirect to the dashboard, with full API-level
 * verification of the POST /auth/validate response: 302 status, Location
 * header pointing at the dashboard, and a session cookie issued with the
 * correct security flags (HttpOnly, Secure, SameSite=Lax).
 */
test('TC-LOGIN-01: valid credentials redirect to dashboard', async ({
  page,
  context,
  loginPage,
  dashboardPage,
}) => {
  await loginPage.goto();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(env.username, env.password),
  ]);

  // [API VERIFICATION]
  expect(response.status()).toBe(302);
  expect(response.headers()['location']).toContain('/dashboard/index');

  const setCookieHeaders = (await response.headersArray()).filter(
    (h) => h.name.toLowerCase() === 'set-cookie',
  );
  expect(setCookieHeaders.length).toBeGreaterThan(0);
  expect(setCookieHeaders[0]!.value).toContain('orangehrm=');
  expect(setCookieHeaders[0]!.value).toContain('HttpOnly');

  const sessionCookie = (await context.cookies()).find((c) => c.name === 'orangehrm');
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.secure).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');

  // [UI VERIFICATION]
  await expect(page).toHaveURL(/dashboard\/index/);
  await expect(dashboardPage.heading).toBeVisible();
});
