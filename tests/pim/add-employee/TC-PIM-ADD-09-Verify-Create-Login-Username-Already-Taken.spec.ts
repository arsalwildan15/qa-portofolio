/**
 * ================================================================================
 * TC-PIM-ADD-09 — Verify Create Login Username Already Taken
 * Modul    : PIM - Add Employee
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-09-Verify-Create-Login-Username-Already-Taken.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi "Create Login Details" dengan username yang sudah dipakai
 *   akun admin ("Admin") menampilkan validasi error dan tidak membuat akun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-09-Verify-Create-Login-Username-Already-Taken.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-09: Create Login with already-taken username shows validation', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-09', 'Create Login Username Already Taken', env.baseURL, page);
  const employee = uniqueEmployeeName('QaDupUser');

  report.step(`Navigate ke Add Employee, fill nama, centang Create Login Details, Username = "${env.username}" (sudah dipakai admin)`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.toggleCreateLoginDetails();
  await addEmployeePage.usernameInput.fill(env.username);
  await addEmployeePage.passwordInput.fill('ValidPass123!');
  await addEmployeePage.confirmPasswordInput.fill('ValidPass123!');

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify validasi username duplikat muncul');
  await addEmployeePage.save();
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.finding(
    'Pesan validasi username duplikat',
    `errors=${JSON.stringify(errors)}, POST terkirim=${submitted}`,
  );
  report.check('Minimal ada 1 pesan validasi field error', errors.length > 0, JSON.stringify(errors));

  report.print();
});
