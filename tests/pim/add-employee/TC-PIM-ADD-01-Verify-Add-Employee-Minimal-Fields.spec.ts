/**
 * ================================================================================
 * TC-PIM-ADD-01 — Verify Add Employee Minimal Fields
 * Modul    : PIM - Add Employee
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-01-Verify-Add-Employee-Minimal-Fields.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi employee baru berhasil dibuat dengan hanya mengisi First
 *   Name + Last Name (field minimal wajib), lalu redirect ke Personal Details.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-01-Verify-Add-Employee-Minimal-Fields.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, urlMatchesWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-01: add employee with minimal required fields succeeds', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-01', 'Add Employee Minimal Fields', env.baseURL, page);
  const employee = uniqueEmployeeName('QaAddMinimal');

  report.step(`Navigate ke Add Employee, fill First Name = "${employee.firstName}", Last Name = "${employee.lastName}"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);

  report.step('Intercept POST /api/v2/pim/employees, klik Save');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);

  report.step('Verify response API dan redirect ke Personal Details');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  report.check(
    '[API] response firstName/lastName sesuai input',
    body?.data?.firstName === employee.firstName && body?.data?.lastName === employee.lastName,
    JSON.stringify(body?.data),
  );
  report.check('[UI] URL redirect ke /pim/viewPersonalDetails', await urlMatchesWithWait(page, /viewPersonalDetails/, 15_000));

  report.print();
});
