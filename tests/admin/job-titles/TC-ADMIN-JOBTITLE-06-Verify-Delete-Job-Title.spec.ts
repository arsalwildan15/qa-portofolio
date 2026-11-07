/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-06: Verify Delete Job Title
 * Modul    : Admin - Job Titles
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-06-Verify-Delete-Job-Title.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Job Title yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete, dikonfirmasi lewat inspeksi DOM
 *   urutan ikon -- lihat CATATAN TEKNIS di docs/TC-Admin.txt).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-06-Verify-Delete-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBTITLE-06: a newly created Job Title can be deleted', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-06', 'Delete Job Title', env.baseURL, page);
  const jobTitle = uniqueName('QaDeleteMe');

  report.step('Buat Job Title baru untuk dihapus');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/job-titles') && r.request().method() === 'POST'),
    adminJobTitlesPage.save(),
  ]);
  await adminJobTitlesPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Job Title yang baru dibuat');
  const row = adminJobTitlesPage.rowByName(jobTitle).first();
  report.check('Job title muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminJobTitlesPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: job title tidak lagi muncul di list');
  report.check(
    `Job title "${jobTitle}" sudah terhapus`,
    !(await adminJobTitlesPage.rowByName(jobTitle).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
