/**
 * ================================================================================
 * TC-PIM-ADD-10 — Verify Password Confirm Mismatch
 * Modul    : PIM - Add Employee
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-10-Verify-Password-Confirm-Mismatch.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi "Create Login Details" dengan Password dan Confirm
 *   Password yang berbeda menampilkan validasi error dan POST tidak
 *   terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-10-Verify-Password-Confirm-Mismatch.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-10: mismatched password and confirm password shows validation', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-10', 'Password Confirm Mismatch', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPwMismatch');

  report.step('Navigate ke Add Employee, centang Create Login Details, isi Password != Confirm Password');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.toggleCreateLoginDetails();
  await addEmployeePage.usernameInput.fill(`qauser${Date.now().toString().slice(-6)}`);
  await addEmployeePage.passwordInput.fill('PasswordOne123!');
  await addEmployeePage.confirmPasswordInput.fill('PasswordTwo456!');

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify validasi password mismatch muncul dan POST tidak terkirim');
  await addEmployeePage.save();
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.check('Minimal ada 1 pesan validasi field error', errors.length > 0, JSON.stringify(errors));
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
