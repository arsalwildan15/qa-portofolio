/**
 * ================================================================================
 * TC-PIM-PD-01 — Verify Fields Prefilled After Add
 * Modul    : PIM - Personal Details
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-PD-01-Verify-Fields-Prefilled-After-Add.spec.ts
 * Path     : tests/pim/personal-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi halaman Personal Details yang muncul setelah Add
 *   Employee sukses sudah ter-prefill dengan Full Name dan Employee Id
 *   dari data yang baru dibuat.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/personal-details/TC-PIM-PD-01-Verify-Fields-Prefilled-After-Add.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-PD-01: Personal Details is pre-filled from the newly created employee', async ({
  page,
  addEmployeePage,
  personalDetailsPage,
}) => {
  const report = new TestReport('TC-PIM-PD-01', 'Fields Prefilled After Add', env.baseURL, page);
  const employee = uniqueEmployeeName('QaPdPrefill');

  report.step(`Buat employee baru "${employee.firstName} ${employee.lastName}"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const expectedId = await addEmployeePage.employeeIdInput.inputValue();
  await addEmployeePage.save();
  await page.waitForURL(/viewPersonalDetails/, { timeout: 20_000 });
  await personalDetailsPage.waitUntilLoaded();

  report.step('Verify First Name, Last Name, dan Employee Id ter-prefill di Personal Details');
  const prefilledFirstName = await personalDetailsPage.firstNameInput.inputValue();
  const prefilledLastName = await personalDetailsPage.lastNameInput.inputValue();
  report.check(
    'First Name ter-prefill sesuai',
    prefilledFirstName === employee.firstName,
    `prefilled="${prefilledFirstName}" expected="${employee.firstName}"`,
  );
  report.check(
    'Last Name ter-prefill sesuai',
    prefilledLastName === employee.lastName,
    `prefilled="${prefilledLastName}" expected="${employee.lastName}"`,
  );
  const prefilledId = await personalDetailsPage.employeeIdInput.inputValue();
  report.check('Employee Id ter-prefill sesuai', prefilledId === expectedId, `prefilled="${prefilledId}" expected="${expectedId}"`);

  report.print();
});
