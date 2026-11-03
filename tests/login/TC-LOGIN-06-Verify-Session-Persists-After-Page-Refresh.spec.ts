/**
 * ================================================================================
 * TC-LOGIN-06 — Verify Session Persists After Page Refresh
 * Modul    : Login
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-LOGIN-06-Verify-Session-Persists-After-Page-Refresh.spec.ts
 * Path     : tests/login/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi sesi login tetap aktif setelah page refresh —
 *   GET /dashboard/index saat reload membalas 200 (bukan redirect ke
 *   login). Kontras langsung dengan TC-LOGIN-25 yang membuktikan GET
 *   yang sama membalas 302 setelah logout.
 *
 * RUN COMMAND:
 *   npx playwright test tests/login/TC-LOGIN-06-Verify-Session-Persists-After-Page-Refresh.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-LOGIN-06: session persists after page refresh', async ({ page }) => {
  const report = new TestReport('TC-LOGIN-06', 'Session Persists After Page Refresh', env.baseURL, page);

  report.step('Login sudah dilakukan via fixture, intercept GET /dashboard/index, reload halaman');
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/dashboard/index') && res.request().method() === 'GET',
    ),
    page.reload(),
  ]);

  report.step('Verify response GET /dashboard/index setelah reload');
  report.check('response.status() === 200', response.status() === 200, `status=${response.status()}`);

  report.step('Verify UI: URL dan heading Dashboard masih tampil');
  report.check('URL tetap "/dashboard/index"', /dashboard\/index/.test(page.url()));
  report.check(
    'Heading "Dashboard" visible',
    await isVisibleWithWait(page.getByRole('heading', { name: 'Dashboard' })),
  );

  report.print();
});
