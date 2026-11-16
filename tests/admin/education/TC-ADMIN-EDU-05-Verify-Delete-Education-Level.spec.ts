/**
 * ================================================================================
 * TC-ADMIN-EDU-05: Verify Delete Education Level
 * Modul    : Admin - Qualifications - Education
 * Kategori : Positive (+) 1.1-D
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-EDU-05-Verify-Delete-Education-Level.spec.ts
 * Path     : tests/admin/education/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Education Level yang baru dibuat bisa dihapus lewat
 *   tombol aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/education/TC-ADMIN-EDU-05-Verify-Delete-Education-Level.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-EDU-05: a newly created Education Level can be deleted', async ({
  page,
  adminEducationPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-EDU-05', 'Delete Education Level', env.baseURL, page);
  const level = uniqueName('QaDeleteEduLevel');

  report.step('Buat Education Level baru untuk dihapus');
  await adminEducationPage.gotoAdd();
  await adminEducationPage.nameInput.fill(level);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/educations') && r.request().method() === 'POST'),
    adminEducationPage.save(),
  ]);
  await adminEducationPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus Education Level yang baru dibuat');
  const row = adminEducationPage.rowByName(level).first();
  report.check('Level muncul sebelum dihapus', await isVisibleWithWait(row, 5_000));
  await adminEducationPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: level tidak lagi muncul di list');
  report.check(
    `Education Level "${level}" sudah terhapus`,
    await isHiddenWithWait(adminEducationPage.rowByName(level).first(), 3_000),
  );

  report.print();
});
