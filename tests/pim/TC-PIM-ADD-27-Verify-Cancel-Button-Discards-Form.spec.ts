/**
 * ================================================================================
 * TC-PIM-ADD-27 — Verify Cancel Button Discards Form
 * Modul    : PIM - Add Employee
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-27-Verify-Cancel-Button-Discards-Form.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik tombol Cancel di tengah pengisian form TIDAK
 *   membuat employee baru dan mengembalikan user ke Employee List.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-27-Verify-Cancel-Button-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, urlMatchesWithWait } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-27: Cancel button discards the form without creating an employee', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-27', 'Cancel Button Discards Form', env.baseURL, page);
  const employee = uniqueEmployeeName('QaCancel');

  report.step('Navigate ke Add Employee, isi First dan Last Name');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Cancel, verify tidak ada POST terkirim dan kembali ke Employee List');
  await addEmployeePage.cancelButton.click();
  report.check('URL kembali ke /pim/viewEmployeeList', await urlMatchesWithWait(page, /viewEmployeeList/));
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
