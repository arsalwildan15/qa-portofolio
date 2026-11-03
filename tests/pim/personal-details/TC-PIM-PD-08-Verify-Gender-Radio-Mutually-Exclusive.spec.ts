/**
 * ================================================================================
 * TC-PIM-PD-08 — Verify Gender Radio Mutually Exclusive
 * Modul    : PIM - Personal Details
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-08-Verify-Gender-Radio-Mutually-Exclusive.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi radio button Gender (Male/Female, dikonfirmasi langsung
 *   ada 2 radio wrapper) bersifat mutually exclusive — memilih Female
 *   setelah Male otomatis melepas pilihan Male.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-08-Verify-Gender-Radio-Mutually-Exclusive.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-08: Male and Female radio buttons are mutually exclusive', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-08', 'Gender Radio Mutually Exclusive', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdGender');

  report.step('Buat employee baru, navigate ke Personal Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Klik radio Male, verify Male tercentang dan Female tidak');
  await personalDetailsPage.clickMaleRadio();
  report.check('Male checked', await personalDetailsPage.maleRadio.isChecked());
  report.check('Female tidak checked', !(await personalDetailsPage.femaleRadio.isChecked()));

  report.step('Klik radio Female, verify Female tercentang dan Male otomatis lepas');
  await personalDetailsPage.clickFemaleRadio();
  report.check('Female checked', await personalDetailsPage.femaleRadio.isChecked());
  report.check('Male otomatis tidak checked', !(await personalDetailsPage.maleRadio.isChecked()));

  report.print();
});
