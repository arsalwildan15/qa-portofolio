/**
 * ================================================================================
 * TC-PIM-ADD-26 — Verify Employee Id Manually Cleared
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-26-Verify-Employee-Id-Manually-Cleared.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi perilaku saat field Employee Id yang sudah ter-prefill
 *   auto-generate di-clear manual oleh user lalu form di-submit — apakah
 *   field ini tetap required, atau server men-generate ulang ID baru.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-26-Verify-Employee-Id-Manually-Cleared.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-26: manually clearing the auto-generated Employee Id then submitting', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-26', 'Employee Id Manually Cleared', env.baseURL, page);
  const employee = uniqueEmployeeName('QaIdCleared');

  report.step('Navigate ke Add Employee, fill nama, clear Employee Id secara manual');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.employeeIdInput.fill('');

  report.step('Klik Save, amati apakah diblokir validasi Required atau server generate ID baru');
  await addEmployeePage.save();
  const requiredErrorVisible = await isVisibleWithWait(
    addEmployeePage.fieldErrors.filter({ hasText: 'Required' }),
    5_000,
  );
  const redirected = await page
    .waitForURL(/viewPersonalDetails/, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  report.finding(
    'Perilaku Employee Id kosong setelah di-clear manual',
    `requiredErrorVisible=${requiredErrorVisible}, redirectedToPersonalDetails=${redirected}.`,
  );
  report.check('Salah satu outcome terjadi (validasi ATAU redirect)', requiredErrorVisible || redirected);

  report.print();
});
