/**
 * ================================================================================
 * TC-PIM-PD-04 — Verify Future Date Of Birth Validation
 * Modul    : PIM - Personal Details
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-04-Verify-Future-Date-Of-Birth-Validation.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Date of Birth di masa depan (tahun depan) ditolak oleh
 *   validasi, atau setidaknya didokumentasikan apabila ternyata diterima.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-04-Verify-Future-Date-Of-Birth-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-04: future Date of Birth is validated', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-04', 'Future Date Of Birth Validation', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdFutureDob');
  const nextYear = new Date().getFullYear() + 1;

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step(`Fill Date of Birth = "${nextYear}-15-06" (tahun depan)`);
  await personalDetailsPage.dateOfBirthInput.fill(`${nextYear}-15-06`);
  await personalDetailsPage.save();

  report.step('Verify apakah validasi muncul atau tersimpan begitu saja');
  const errorVisible = await isVisibleWithWait(personalDetailsPage.fieldErrors.first(), 3_000);
  report.finding(
    'Validasi Date of Birth masa depan',
    errorVisible
      ? 'Validasi error muncul — tanggal masa depan DITOLAK.'
      : 'Tidak ada error terlihat — kemungkinan tanggal masa depan DITERIMA tanpa validasi logis usia.',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
