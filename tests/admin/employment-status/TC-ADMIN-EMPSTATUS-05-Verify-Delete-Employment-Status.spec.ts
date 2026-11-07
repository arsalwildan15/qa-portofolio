/**
 * ================================================================================
 * TC-ADMIN-EMPSTATUS-05: Verify Delete Employment Status
 * Modul    : Admin - Employment Status
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EMPSTATUS-05-Verify-Delete-Employment-Status.spec.ts
 * Path     : tests/admin/employment-status/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Employment Status yang baru dibuat bisa dihapus lewat
 *   tombol aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/employment-status/TC-ADMIN-EMPSTATUS-05-Verify-Delete-Employment-Status.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EMPSTATUS-05: a newly created Employment Status can be deleted', async ({
  page,
  adminEmploymentStatusPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EMPSTATUS-05', 'Delete Employment Status', env.baseURL, page);
  const name = uniqueName('QaDeleteEmpStatus');

  report.step('Buat Employment Status baru untuk dihapus');
  await adminEmploymentStatusPage.gotoAdd();
  await adminEmploymentStatusPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/employment-statuses') && r.request().method() === 'POST'),
    adminEmploymentStatusPage.save(),
  ]);
  await adminEmploymentStatusPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Employment Status yang baru dibuat');
  const row = adminEmploymentStatusPage.rowByName(name).first();
  report.check('Employment status muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminEmploymentStatusPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: employment status tidak lagi muncul di list');
  report.check(
    `Employment status "${name}" sudah terhapus`,
    !(await adminEmploymentStatusPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
