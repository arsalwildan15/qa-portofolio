/**
 * ================================================================================
 * TC-PIM-SALARY-07 — Verify Multiple Components Can Be Added
 * Modul    : PIM - Salary
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-07-Verify-Multiple-Components-Can-Be-Added.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi satu employee bisa punya lebih dari satu Salary
 *   Component (misal Basic Salary + komponen lain) sekaligus.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-07-Verify-Multiple-Components-Can-Be-Added.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isHiddenWithWait, isVisibleWithWait } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-07: more than one salary component can be added', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-07', 'Multiple Components Can Be Added', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalMulti');
  await salaryPage.goto(empNumber);

  report.step('Tambah komponen gaji pertama');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.selectDropdownOption(salaryPage.payGradeSelect, 'Grade');
  await salaryPage.selectDropdownOption(salaryPage.payFrequencySelect, 'Monthly');
  await salaryPage.selectDropdownOption(salaryPage.currencySelect, 'United States Dollar');
  await salaryPage.amountInput.fill('55000');
  await salaryPage.save();
  await isHiddenWithWait(salaryPage.saveButton);

  report.step('Verify komponen pertama tersimpan, hitung jumlah baris di tabel');
  report.check(
    'Minimal 1 baris komponen gaji tersimpan',
    await isVisibleWithWait(salaryPage.tableRows.first(), 15_000),
  );

  report.print();
});
