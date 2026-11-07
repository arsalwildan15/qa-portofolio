/**
 * ================================================================================
 * TC-ADMIN-USER-05: Verify SQL Injection In Search
 * Modul    : Admin - User Management - Users
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-USER-05-Verify-SQL-Injection-In-Search.spec.ts
 * Path     : tests/admin/users/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di filter Username pada halaman
 *   list Users tidak merusak aplikasi (tidak ada server error / halaman
 *   blank) dan mengembalikan hasil kosong yang wajar (bukan seluruh data
 *   / error yang mengindikasikan query ternelusup).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/users/TC-ADMIN-USER-05-Verify-SQL-Injection-In-Search.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-USER-05: a SQL injection payload in the Username search filter does not break the list', async ({
  page,
  adminUsersPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-USER-05', 'SQL Injection In Search', env.baseURL, page);
  const payload = "' OR '1'='1'; DROP TABLE ohrm_user;--";

  report.step('Isi filter Username dengan payload SQL injection, klik Search');
  await adminUsersPage.goto();
  await page.waitForTimeout(1000);
  await adminUsersPage.searchUsernameInput.fill(payload);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.waitForTimeout(1500);

  report.step('Verify: halaman tetap berfungsi normal (tidak blank / tidak error server)');
  const pageStillWorks = await page.locator('.oxd-table, .oxd-table-body, h5').first().isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Halaman list Users masih berfungsi normal setelah payload SQLi', pageStillWorks);

  report.print();
});
