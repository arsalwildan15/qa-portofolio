/**
 * ================================================================================
 * TC-PIM-SALARY-02 — Verify Empty Submit Validation
 * Modul    : PIM - Salary
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Salary Component kosong menampilkan
 *   validasi required dan request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-02: empty submit shows required validation', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalEmpty');
  await salaryPage.goto(empNumber);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('salary')) saveRequestFired = true;
  });

  report.step('Klik "+ Add", langsung klik Save tanpa isi apapun');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await salaryPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST salary TIDAK terkirim', saveRequestFired === false);

  report.print();
});
