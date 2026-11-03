/**
 * ================================================================================
 * TC-LOGIN-39 — Verify Dashboard Not Accessible After Cookie Deleted
 * Modul    : Login
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-39-Verify-Dashboard-Not-Accessible-After-Cookie-Deleted.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi dashboard tidak bisa diakses setelah session cookie
 *   dihapus secara client-side (simulasi cookie expiry/tampering) —
 *   server sendiri yang menolak request (302), bukan hanya redirect
 *   client-side, sehingga tidak ada data dashboard yang leak sebelum
 *   redirect terjadi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-39-Verify-Dashboard-Not-Accessible-After-Cookie-Deleted.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';

test('TC-LOGIN-39: dashboard not accessible after session cookie is deleted', async ({
  page,
  context,
}) => {
  const report = new TestReport('TC-LOGIN-39', 'Dashboard Not Accessible After Cookie Deleted', env.baseURL);

  report.step('Hapus semua cookie dari session yang sudah authenticated');
  await context.clearCookies();

  report.step('GET /dashboard/index secara langsung setelah cookie dihapus');
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/dashboard/index') && res.request().method() === 'GET',
    ),
    page.goto('/web/index.php/dashboard/index'),
  ]);

  report.step('Verify server redirect 302, client di /auth/login, dan heading Dashboard tidak muncul');
  report.check('[API] Response status === 302', response.status() === 302, `status=${response.status()}`);
  report.check('[UI] URL mengandung "/auth/login"', /auth\/login/.test(page.url()));
  report.check(
    '[UI] count(heading "Dashboard") === 0',
    (await page.getByRole('heading', { name: 'Dashboard' }).count()) === 0,
  );

  report.print();
});
