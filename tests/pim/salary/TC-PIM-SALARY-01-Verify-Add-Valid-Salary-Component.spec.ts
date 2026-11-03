/**
 * ================================================================================
 * TC-PIM-SALARY-01 — Verify Add Valid Salary Component
 * Modul    : PIM - Salary
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-01-Verify-Add-Valid-Salary-Component.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Salary Component dengan Pay Grade, Pay
 *   Frequency, Currency, dan Amount lengkap berhasil tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-01-Verify-Add-Valid-Salary-Component.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isHiddenWithWait, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-01: add valid salary component succeeds', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-01', 'Add Valid Salary Component', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalValid');
  await salaryPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Salary Component, Pay Grade, Pay Frequency, Currency, isi Amount, klik Save');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.selectDropdownOption(salaryPage.payGradeSelect, 'Grade');
  await salaryPage.selectDropdownOption(salaryPage.payFrequencySelect, 'Monthly');
  await salaryPage.selectDropdownOption(salaryPage.currencySelect, 'United States Dollar');
  await salaryPage.amountInput.fill('55000');
  await salaryPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify komponen tersimpan di tabel Assigned Salary Components');
  report.check('[API] Modal tertutup (form Save hilang)', await isHiddenWithWait(salaryPage.saveButton));
  report.check(
    'Minimal 1 baris komponen gaji di tabel',
    await isVisibleWithWait(salaryPage.tableRows.first(), 15_000),
  );

  report.print();
});
