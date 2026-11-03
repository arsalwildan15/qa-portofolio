/**
 * ================================================================================
 * TC-PIM-ADD-13 — Verify Employee Id 10 Characters Boundary
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-13-Verify-Employee-Id-10-Characters-Boundary.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Employee Id tepat 10 karakter (batas maksimum yang
 *   dikonfirmasi langsung) diterima tanpa validasi length error.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-13-Verify-Employee-Id-10-Characters-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-13: Employee Id at exactly 10 characters is accepted', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-13', 'Employee Id 10 Characters Boundary', env.baseURL, page);
  const employee = uniqueEmployeeName('QaId10');
  const employeeId10 = `ID${Date.now().toString().slice(-8)}`; // exactly 10 chars

  report.step(`Navigate ke Add Employee, fill nama, set Employee Id = "${employeeId10}" (10 char)`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.employeeIdInput.fill(employeeId10);

  report.step('Klik Save, verify tidak ada validasi length error dan POST terkirim');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  const body = await resp.json().catch(() => null);
  report.check('[API] employeeId sesuai input', body?.data?.employeeId === employeeId10, JSON.stringify(body?.data));

  report.print();
});
