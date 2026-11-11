/**
 * ================================================================================
 * TC-LOGIN-25 — Verify Session Invalidated After Logout
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-25-Verify-Session-Invalidated-After-Logout.spec.ts
 * Path     : tests/login/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi session di-invalidate setelah logout — GET
 *   /dashboard/index sesudahnya mengembalikan 302 (redirect ke login),
 *   BUKAN 200 seperti pada session aktif (kontras dengan TC-LOGIN-06).
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/security/TC-LOGIN-25-Verify-Session-Invalidated-After-Logout.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-LOGIN-25: session is invalidated after logout', async ({ page, dashboardPage }) => {
  const report = new TestReport('TC-LOGIN-25', 'Session Invalidated After Logout', env.baseURL, page);

  report.step('Logout dari session yang sudah authenticated');
  await dashboardPage.logout();
  await page.waitForURL(/auth\/login/);

  report.step('GET /dashboard/index secara langsung setelah logout');
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/dashboard/index') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/dashboard/index'),
  ]);

  report.step('Verify server redirect 302 dan client berakhir di /auth/login');
  report.check('[API] Response status === 302', response.status() === 302, `status=${response.status()}`);
  report.check('[UI] URL mengandung "/auth/login"', /auth\/login/.test(page.url()));

  report.print();
});
