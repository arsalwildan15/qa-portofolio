/**
 * ================================================================================
 * TC-PIM-SALARY-03 — Verify Negative Amount
 * Modul    : PIM - Salary
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-03-Verify-Negative-Amount.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Amount diisi angka negatif ("-5000") — apakah ada
 *   validasi logis "gaji tidak boleh negatif" atau diterima begitu
 *   saja. Hasil didokumentasikan sebagai observasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-03-Verify-Negative-Amount.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-03: negative amount behavior is documented', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-03', 'Negative Amount', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalNeg');
  await salaryPage.goto(empNumber);

  report.step('Isi field wajib, Amount = "-5000" (negatif), klik Save');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.selectDropdownOption(salaryPage.payGradeSelect, 'Grade');
  await salaryPage.selectDropdownOption(salaryPage.payFrequencySelect, 'Monthly');
  await salaryPage.selectDropdownOption(salaryPage.currencySelect, 'United States Dollar');
  await salaryPage.amountInput.fill('-5000');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await salaryPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash, catat apakah ada validasi angka negatif');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);
  const errorCount = await salaryPage.fieldErrors.count();
  report.finding(
    'Validasi Amount negatif',
    errorCount > 0
      ? 'Ada validasi yang menolak Amount negatif.'
      : 'Amount "-5000" DITERIMA tanpa validasi logis — tidak ada pengecekan "gaji tidak boleh negatif".',
  );

  report.print();
});
