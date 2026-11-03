/**
 * ================================================================================
 * TC-PIM-ADD-03 — Verify Create Login Details Reveals Fields
 * Modul    : PIM - Add Employee
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-03-Verify-Create-Login-Details-Reveals-Fields.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi checkbox "Create Login Details" (dikonfirmasi: elemen
 *   role="checkbox" dengan native input tersembunyi secara visual, perlu
 *   click({force:true})) memunculkan field Username/Password/Confirm Password.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-03-Verify-Create-Login-Details-Reveals-Fields.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';

test('TC-PIM-ADD-03: Create Login Details checkbox reveals username/password fields', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-03', 'Create Login Details Reveals Fields', env.baseURL, page);

  report.step('Navigate ke Add Employee, centang "Create Login Details"');
  await addEmployeePage.goto();
  await addEmployeePage.toggleCreateLoginDetails();

  report.step('Verify field Username, Password, Confirm Password muncul');
  report.check('Username field visible', await isVisibleWithWait(addEmployeePage.usernameInput));
  report.check('Password field visible', await isVisibleWithWait(addEmployeePage.passwordInput));
  report.check('Confirm Password field visible', await isVisibleWithWait(addEmployeePage.confirmPasswordInput));

  report.print();
});
