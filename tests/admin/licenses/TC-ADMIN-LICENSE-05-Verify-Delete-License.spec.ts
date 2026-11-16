/**
 * ================================================================================
 * TC-ADMIN-LICENSE-05: Verify Delete License
 * Modul    : Admin - Qualifications - Licenses
 * Kategori : Positive (+) 1.1-D
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-LICENSE-05-Verify-Delete-License.spec.ts
 * Path     : tests/admin/licenses/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi License yang baru dibuat bisa dihapus lewat tombol
 *   aksi pertama di row (trash/delete).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/licenses/TC-ADMIN-LICENSE-05-Verify-Delete-License.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait, isHiddenWithWait } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-LICENSE-05: a newly created License can be deleted', async ({
  page,
  adminLicensesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-LICENSE-05', 'Delete License', env.baseURL, page);
  const name = uniqueName('QaDeleteLicense');

  report.step('Buat License baru untuk dihapus');
  await adminLicensesPage.gotoAdd();
  await adminLicensesPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/licenses') && r.request().method() === 'POST'),
    adminLicensesPage.save(),
  ]);
  await adminLicensesPage.goto();
  await page.waitForTimeout(1200);

  report.step('Hapus License yang baru dibuat');
  const row = adminLicensesPage.rowByName(name).first();
  report.check('License muncul sebelum dihapus', await isVisibleWithWait(row, 5_000));
  await adminLicensesPage.deleteRow(row);
  await page.waitForTimeout(1200);

  report.step('Verify: license tidak lagi muncul di list');
  report.check(
    `License "${name}" sudah terhapus`,
    await isHiddenWithWait(adminLicensesPage.rowByName(name).first(), 3_000),
  );

  report.print();
});
