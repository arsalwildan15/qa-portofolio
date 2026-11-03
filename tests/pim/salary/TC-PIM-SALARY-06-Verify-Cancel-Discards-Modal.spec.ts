/**
 * ================================================================================
 * TC-PIM-SALARY-06 — Verify Cancel Discards Modal
 * Modul    : PIM - Salary
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-SALARY-06-Verify-Cancel-Discards-Modal.spec.ts
 * Path     : tests/pim/salary/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel di modal Add Salary Component membatalkan
 *   input — data TIDAK tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/salary/TC-PIM-SALARY-06-Verify-Cancel-Discards-Modal.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-SALARY-06: cancel button discards the modal without saving', async ({
  page,
  addEmployeePage,
  salaryPage,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  const report = new TestReport('TC-PIM-SALARY-06', 'Cancel Discards Modal', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Salary');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaSalCancel');
  await salaryPage.goto(empNumber);

  report.step('Klik "+ Add", pilih Salary Component, klik Cancel (bukan Save)');
  await salaryPage.addButton.click();
  await salaryPage.salaryComponentInput.waitFor({ state: 'visible' });
  await salaryPage.salaryComponentInput.fill('Basic Salary');
  await salaryPage.cancelButton.click();
  await page.waitForTimeout(1000);

  report.step('Verify tabel tetap tidak berisi "Basic Salary"');
  const count = await page.locator('.oxd-table-card').count();
  report.check('Tidak ada row baru tertambah', count === 0, `rowCount=${count}`);

  report.print();
});
