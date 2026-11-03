/**
 * ================================================================================
 * TC-LOGIN-01 — Verify Valid Credentials Redirect To Dashboard
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-01-Verify-Valid-Credentials-Redirect-To-Dashboard.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi login dengan kredensial valid ("Admin" / "admin123")
 *   berhasil mengarahkan ke dashboard, DAN memverifikasi session cookie
 *   yang dikirim server (orangehrm=...) punya flag keamanan yang benar
 *   (HttpOnly, Secure, SameSite=Lax) — bukan cuma cek redirect UI.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-01-Verify-Valid-Credentials-Redirect-To-Dashboard.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait, urlMatchesWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-01: valid credentials redirect to dashboard', async ({
  page,
  context,
  loginPage,
  dashboardPage,
}) => {
  const report = new TestReport('TC-LOGIN-01', 'Valid Credentials Redirect To Dashboard', env.baseURL, page);

  report.step('Buka halaman login');
  await loginPage.goto();

  report.step('Isi Username = "Admin", Password = "admin123"');
  report.step('Intercept POST /auth/validate, klik "Login"');
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/auth/validate')),
    loginPage.login(env.username, env.password),
  ]);

  report.step('Verify response /auth/validate (status, Location, Set-Cookie)');
  report.check('response.status() === 302', response.status() === 302, `status=${response.status()}`);
  const location = response.headers()['location'] ?? '';
  report.check(
    'Header Location mengandung "/dashboard/index"',
    location.includes('/dashboard/index'),
    `location="${location}"`,
  );

  const setCookieHeaders = (await response.headersArray()).filter(
    (h) => h.name.toLowerCase() === 'set-cookie',
  );
  report.check(
    'Header Set-Cookie ada & mengandung "orangehrm="',
    setCookieHeaders.length > 0 && setCookieHeaders[0]!.value.includes('orangehrm='),
    setCookieHeaders[0]?.value ?? 'tidak ada Set-Cookie',
  );
  report.check(
    'Set-Cookie mengandung flag HttpOnly',
    (setCookieHeaders[0]?.value ?? '').includes('HttpOnly'),
  );

  report.step('Verify flag cookie via context.cookies() (httpOnly/secure/sameSite)');
  const sessionCookie = (await context.cookies()).find((c) => c.name === 'orangehrm');
  report.check('Cookie "orangehrm" ditemukan di context', sessionCookie !== undefined);
  report.check('Cookie httpOnly === true', sessionCookie?.httpOnly === true);
  report.check('Cookie secure === true', sessionCookie?.secure === true);
  report.check(
    'Cookie sameSite === "Lax"',
    sessionCookie?.sameSite === 'Lax',
    `sameSite="${sessionCookie?.sameSite}"`,
  );

  report.step('Verify UI: URL dan heading Dashboard');
  report.check(
    'URL mengandung "/dashboard/index"',
    await urlMatchesWithWait(page, /dashboard\/index/),
    `url=${page.url()}`,
  );
  report.check('Heading "Dashboard" visible', await isVisibleWithWait(dashboardPage.heading));

  report.print();
});
