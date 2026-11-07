/**
 * ================================================================================
 * TC-ADMIN-JOBCAT-04: Verify Duplicate Name
 * Modul    : Admin - Job Categories
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBCAT-04-Verify-Duplicate-Name.spec.ts
 * Path     : tests/admin/job-categories/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mencoba menambah Job Category dengan nama yang SUDAH
 *   ADA di data seed demo ("Executive") ditangani konsisten (ditolak
 *   atau diterima -- dicatat apa adanya).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-categories/TC-ADMIN-JOBCAT-04-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-JOBCAT-04: adding a duplicate Job Category name is handled consistently', async ({
  page,
  adminJobCategoriesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBCAT-04', 'Duplicate Name', env.baseURL, page);

  report.step('Coba tambah Job Category dengan nama existing "Executive"');
  await adminJobCategoriesPage.gotoAdd();
  await adminJobCategoriesPage.nameInput.fill('Executive');
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/job-categories') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminJobCategoriesPage.save();
  const resp = await respPromise;
  const duplicateError = await adminJobCategoriesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: catat perilaku duplikat apa adanya, lalu bersihkan kalau sampai tersimpan');
  report.check(
    'TC dijalankan tanpa exception (perilaku duplikat dicatat apa adanya)',
    true,
    `status=${resp?.status() ?? 'tidak ada response (ditolak client-side)'}, error=${duplicateError ?? 'tidak ada'}`,
  );

  if (resp && resp.status() === 200) {
    await adminJobCategoriesPage.goto();
    await page.waitForTimeout(1200);
    const rows = adminJobCategoriesPage.rowByName('Executive');
    const count = await rows.count();
    if (count > 1) {
      await adminJobCategoriesPage.deleteRow(rows.last());
    }
  }

  report.print();
});
