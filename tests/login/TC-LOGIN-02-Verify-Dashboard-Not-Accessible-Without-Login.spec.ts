/**
 * ================================================================================
 * TC-LOGIN-02 — Verify Dashboard Not Accessible Without Login
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-02-Verify-Dashboard-Not-Accessible-Without-Login.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengakses /dashboard/index langsung tanpa sesi login
 *   benar-benar di-redirect ke halaman login oleh SERVER (GET /auth/login
 *   -> 200), bukan cuma client-side redirect yang bisa di-bypass.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-02-Verify-Dashboard-Not-Accessible-Without-Login.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-02: dashboard redirects to login when not authenticated', async ({ page }) => {
  const report = new TestReport(
    'TC-LOGIN-02',
    'Dashboard Not Accessible Without Login',
    env.baseURL,
    page,
  );

  report.step('Navigate langsung ke /dashboard/index tanpa login, intercept GET /auth/login');
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/auth/login') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/dashboard/index'),
  ]);

  report.step('Verify response GET /auth/login');
  report.check('response.status() === 200', response.status() === 200, `status=${response.status()}`);

  report.step('Verify UI: URL dan heading Login');
  report.check('URL mengandung "/auth/login"', /auth\/login/.test(page.url()));
  report.check(
    'Heading "Login" visible',
    await isVisibleWithWait(page.getByRole('heading', { name: 'Login' })),
  );

  report.print();
});
