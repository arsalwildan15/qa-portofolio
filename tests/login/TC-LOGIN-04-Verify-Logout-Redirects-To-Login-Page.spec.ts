/**
 * ================================================================================
 * TC-LOGIN-04 — Verify Logout Redirects To Login Page
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-04-Verify-Logout-Redirects-To-Login-Page.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik "Logout" dari dropdown user mengirim
 *   POST /auth/logout yang membalas 302 ke /auth/login, dan UI benar-benar
 *   berpindah ke halaman login.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-04-Verify-Logout-Redirects-To-Login-Page.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait, urlMatchesWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-04: logout redirects back to login page', async ({ page, dashboardPage }) => {
  const report = new TestReport('TC-LOGIN-04', 'Logout Redirects To Login Page', env.baseURL, page);

  report.step('Login sudah dilakukan via fixture, klik user dropdown');
  await dashboardPage.userDropdown.click();

  report.step('Intercept POST /auth/logout, klik menu "Logout"');
  const [logoutResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/logout')),
    dashboardPage.logoutMenuItem.click(),
  ]);

  report.step('Verify response /auth/logout');
  report.check(
    'response.status() === 302',
    logoutResponse.status() === 302,
    `status=${logoutResponse.status()}`,
  );
  const location = logoutResponse.headers()['location'] ?? '';
  report.check(
    'Header Location mengandung "/auth/login"',
    location.includes('/auth/login'),
    `location="${location}"`,
  );

  report.step('Verify UI: URL dan heading Login');
  report.check(
    'URL mengandung "/auth/login"',
    await urlMatchesWithWait(page, /auth\/login/),
    `url=${page.url()}`,
  );
  report.check(
    'Heading "Login" visible',
    await isVisibleWithWait(page.getByRole('heading', { name: 'Login' })),
  );

  report.print();
});
