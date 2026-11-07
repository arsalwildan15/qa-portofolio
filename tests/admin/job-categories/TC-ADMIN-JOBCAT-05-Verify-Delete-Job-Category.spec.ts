/**
 * ================================================================================
 * TC-ADMIN-JOBCAT-05: Verify Delete Job Category
 * Modul    : Admin - Job Categories
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBCAT-05-Verify-Delete-Job-Category.spec.ts
 * Path     : tests/admin/job-categories/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Job Category yang baru dibuat bisa dihapus lewat
 *   tombol aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-categories/TC-ADMIN-JOBCAT-05-Verify-Delete-Job-Category.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBCAT-05: a newly created Job Category can be deleted', async ({
  page,
  adminJobCategoriesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-JOBCAT-05', 'Delete Job Category', env.baseURL, page);
  const name = uniqueName('QaDeleteJobCat');

  report.step('Buat Job Category baru untuk dihapus');
  await adminJobCategoriesPage.gotoAdd();
  await adminJobCategoriesPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/job-categories') && r.request().method() === 'POST'),
    adminJobCategoriesPage.save(),
  ]);
  await adminJobCategoriesPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Job Category yang baru dibuat');
  const row = adminJobCategoriesPage.rowByName(name).first();
  report.check('Job category muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminJobCategoriesPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: job category tidak lagi muncul di list');
  report.check(
    `Job category "${name}" sudah terhapus`,
    !(await adminJobCategoriesPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
