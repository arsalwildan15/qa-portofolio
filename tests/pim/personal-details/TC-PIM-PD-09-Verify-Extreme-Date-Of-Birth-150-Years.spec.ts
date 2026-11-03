/**
 * ================================================================================
 * TC-PIM-PD-09 — Verify Extreme Date Of Birth 150 Years
 * Modul    : PIM - Personal Details
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-09-Verify-Extreme-Date-Of-Birth-150-Years.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Date of Birth 150 tahun lalu (usia tidak masuk akal)
 *   diterima atau ditolak — mendokumentasikan apakah ada validasi usia
 *   yang masuk akal.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-09-Verify-Extreme-Date-Of-Birth-150-Years.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-09: Date of Birth 150 years ago is handled', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-09', 'Extreme Date Of Birth 150 Years', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdExtremeDob');
  const extremeYear = new Date().getFullYear() - 150;

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step(`Fill Date of Birth = "${extremeYear}-15-06" (150 tahun lalu)`);
  await personalDetailsPage.dateOfBirthInput.fill(`${extremeYear}-15-06`);
  await personalDetailsPage.save();

  report.step('Verify apakah ada validasi usia masuk akal, atau diterima tanpa batas');
  const errorVisible = await isVisibleWithWait(personalDetailsPage.fieldErrors.first(), 3_000);
  report.finding(
    'Validasi usia ekstrem (150 tahun)',
    errorVisible
      ? 'Ada validasi yang menolak tanggal lahir 150 tahun lalu.'
      : 'Tidak ada validasi usia masuk akal — tanggal lahir 150 tahun lalu diterima begitu saja.',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
