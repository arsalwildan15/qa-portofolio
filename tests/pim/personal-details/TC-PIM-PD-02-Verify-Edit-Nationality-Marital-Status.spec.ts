/**
 * ================================================================================
 * TC-PIM-PD-02 — Verify Edit Nationality Marital Status
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-02-Verify-Edit-Nationality-Marital-Status.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengubah dropdown Nationality dan Marital Status lalu
 *   klik Save berhasil (PUT /api/v2/pim/employees/{id}/personal-details,
 *   dikonfirmasi langsung sebagai endpoint save PD).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-02-Verify-Edit-Nationality-Marital-Status.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-02: editing Nationality and Marital Status saves successfully', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-02', 'Edit Nationality Marital Status', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdNat');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Pilih Nationality dan Marital Status');
  await personalDetailsPage.selectDropdownOption(personalDetailsPage.nationalitySelect, 'Indonesian');
  await personalDetailsPage.selectDropdownOption(personalDetailsPage.maritalStatusSelect, 'Single');

  report.step('Klik Save, verify PUT personal-details status 200');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /personal-details/.test(r.url()) && r.request().method() === 'PUT'),
    personalDetailsPage.save(),
  ]);
  report.check('[API] PUT personal-details status === 200', resp.status() === 200, `status=${resp.status()}`);

  report.print();
});
