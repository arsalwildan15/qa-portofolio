/**
 * ================================================================================
 * TC-PIM-SALARY-05 — Verify XSS In Comments
 * Modul    : PIM - Salary
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-05-Verify-XSS-In-Comments.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Comments tidak pernah tereksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-05-Verify-XSS-In-Comments.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-05: XSS payload in Comments is not executed', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-05', 'XSS In Comments', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalXss');
  await salaryPage.goto(empNumber);

  report.step(`Isi field wajib, Comments = "<script>alert('xss')</script>", klik Save`);
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.selectDropdownOption(salaryPage.payGradeSelect, 'Grade');
  await salaryPage.selectDropdownOption(salaryPage.payFrequencySelect, 'Monthly');
  await salaryPage.selectDropdownOption(salaryPage.currencySelect, 'United States Dollar');
  await salaryPage.amountInput.fill('1000000');
  await salaryPage.commentsInput.fill("<script>alert('xss')</script>");
  await salaryPage.save();
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() yang terpicu');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);

  report.print();
});
