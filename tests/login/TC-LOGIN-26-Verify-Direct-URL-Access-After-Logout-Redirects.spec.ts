/**
 * ================================================================================
 * TC-LOGIN-26 — Verify Direct URL Access After Logout Redirects
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-26-Verify-Direct-URL-Access-After-Logout-Redirects.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi URL protected (modul PIM) tidak bisa diakses setelah
 *   logout — server sendiri yang redirect (302), bukan hanya UI client,
 *   sehingga data karyawan tidak bisa leak via cached response atau
 *   direct API call.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-26-Verify-Direct-URL-Access-After-Logout-Redirects.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-26: protected URL redirects to login after logout', async ({
  page,
  dashboardPage,
}) => {
  const report = new TestReport('TC-LOGIN-26', 'Direct URL Access After Logout Redirects', env.baseURL);

  report.step('Logout dari session yang sudah authenticated');
  await dashboardPage.logout();
  await page.waitForURL(/auth\/login/);

  report.step('GET /pim/viewPimModule secara langsung setelah logout');
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/pim/viewPimModule') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/pim/viewPimModule'),
  ]);

  report.step('Verify server redirect 302, client di /auth/login, data karyawan tidak leak');
  report.check('[API] Response status === 302', response.status() === 302, `status=${response.status()}`);
  report.check('[UI] URL mengandung "/auth/login"', /auth\/login/.test(page.url()));
  report.check(
    '[UI] Teks "Employee Information" tidak ditemukan',
    (await page.getByText('Employee Information').count()) === 0,
  );

  report.print();
});
