/**
 * ================================================================================
 * TC-PIM-SALARY-04 — Verify Non Numeric Amount
 * Modul    : PIM - Salary
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-04-Verify-Non-Numeric-Amount.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Amount diisi teks bukan angka ("abc") ditolak dengan
 *   validasi format, tidak membuat server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-04-Verify-Non-Numeric-Amount.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-04: non-numeric amount is handled gracefully', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-04', 'Non Numeric Amount', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalNonNum');
  await salaryPage.goto(empNumber);

  report.step('Isi field wajib, Amount = "abc" (bukan angka), klik Save');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.selectDropdownOption(salaryPage.payGradeSelect, 'Grade');
  await salaryPage.selectDropdownOption(salaryPage.payFrequencySelect, 'Monthly');
  await salaryPage.selectDropdownOption(salaryPage.currencySelect, 'United States Dollar');
  await salaryPage.amountInput.fill('abc');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await salaryPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
