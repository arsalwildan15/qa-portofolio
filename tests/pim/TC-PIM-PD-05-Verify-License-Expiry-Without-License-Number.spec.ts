/**
 * ================================================================================
 * TC-PIM-PD-05 — Verify License Expiry Without License Number
 * Modul    : PIM - Personal Details
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-05-Verify-License-Expiry-Without-License-Number.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengisi License Expiry Date TANPA mengisi Driver's
 *   License Number — apakah ada validasi dependency antar field, atau
 *   diterima begitu saja.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-PD-05-Verify-License-Expiry-Without-License-Number.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-PD-05: License Expiry Date without License Number', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-05', 'License Expiry Without License Number', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdLicense');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Fill License Expiry Date SAJA, biarkan Driver\'s License Number kosong');
  await personalDetailsPage.licenseExpiryDateInput.fill('2030-15-06');
  await personalDetailsPage.save();

  report.step('Verify apakah ada validasi dependency, atau diterima begitu saja');
  const errorVisible = await isVisibleWithWait(personalDetailsPage.fieldErrors.first(), 3_000);
  report.finding(
    'Validasi dependency License Number <-> License Expiry',
    errorVisible
      ? 'Ada validasi muncul saat Expiry Date diisi tanpa License Number.'
      : 'Tidak ada validasi dependency — kedua field independen satu sama lain.',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
