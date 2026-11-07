/**
 * ================================================================================
 * TC-ADMIN-PAYGRADE-05: Verify Delete Pay Grade
 * Modul    : Admin - Pay Grades
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-PAYGRADE-05-Verify-Delete-Pay-Grade.spec.ts
 * Path     : tests/admin/pay-grades/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Pay Grade yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/pay-grades/TC-ADMIN-PAYGRADE-05-Verify-Delete-Pay-Grade.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-PAYGRADE-05: a newly created Pay Grade can be deleted', async ({
  page,
  adminPayGradesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-PAYGRADE-05', 'Delete Pay Grade', env.baseURL, page);
  const name = uniqueName('QaDeletePayGrade');

  report.step('Buat Pay Grade baru untuk dihapus');
  await adminPayGradesPage.gotoAdd();
  await adminPayGradesPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/pay-grades') && r.request().method() === 'POST'),
    adminPayGradesPage.save(),
  ]);
  await adminPayGradesPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Pay Grade yang baru dibuat');
  const row = adminPayGradesPage.rowByName(name).first();
  report.check('Pay grade muncul sebelum dihapus', await row.isVisible({ timeout: 5_000 }).catch(() => false));
  await adminPayGradesPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: pay grade tidak lagi muncul di list');
  report.check(
    `Pay grade "${name}" sudah terhapus`,
    !(await adminPayGradesPage.rowByName(name).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
