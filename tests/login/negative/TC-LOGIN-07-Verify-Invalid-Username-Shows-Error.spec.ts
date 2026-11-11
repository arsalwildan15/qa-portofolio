/**
 * ================================================================================
 * TC-LOGIN-07 — Verify Invalid Username Shows Error
 * Modul    : Login
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-07-Verify-Invalid-Username-Shows-Error.spec.ts
 * Path     : tests/login/negative/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi username yang tidak terdaftar ditolak oleh server
 *   (302 ke /auth/login, TIDAK ADA Set-Cookie sama sekali — sesi tidak
 *   dibuat) dan UI menampilkan pesan error generik "Invalid credentials".
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/negative/TC-LOGIN-07-Verify-Invalid-Username-Shows-Error.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-LOGIN-07: invalid username shows error message', async ({ page, loginPage }) => {
  const report = new TestReport('TC-LOGIN-07', 'Invalid Username Shows Error', env.baseURL, page);

  report.step('Navigate ke halaman login');
  await loginPage.goto();

  report.step('Fill Username = "InvalidUser", Password = valid; intercept POST /auth/validate');
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login('InvalidUser', env.password),
  ]);

  report.step('Verify response /auth/validate (status, Location, Set-Cookie)');
  report.check('response.status() === 302', response.status() === 302, `status=${response.status()}`);
  const location = response.headers()['location'] ?? '';
  report.check(
    'Header Location mengandung "/auth/login"',
    location.includes('/auth/login'),
    `location="${location}"`,
  );
  const setCookieHeaders = (await response.headersArray()).filter(
    (h) => h.name.toLowerCase() === 'set-cookie',
  );
  report.check(
    'TIDAK ada header Set-Cookie (sesi tidak dibuat)',
    setCookieHeaders.length === 0,
    `jumlah Set-Cookie=${setCookieHeaders.length}`,
  );

  report.step('Verify UI: pesan error dan URL');
  report.check('Error ".oxd-alert--error" visible', await isVisibleWithWait(loginPage.errorMessage));
  report.check(
    'Error berisi "Invalid credentials"',
    (await loginPage.errorMessage.textContent())?.includes('Invalid credentials') ?? false,
  );
  report.check('URL tetap "/auth/login"', /auth\/login/.test(page.url()));

  report.print();
});
