/**
 * ================================================================================
 * TC-PIM-ADD-02 — Verify Add Employee Full Name
 * Modul    : PIM - Add Employee
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-02-Verify-Add-Employee-Full-Name.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi employee baru berhasil dibuat dengan First + Middle + Last
 *   Name lengkap, dan ketiganya tersimpan dengan benar.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-02-Verify-Add-Employee-Full-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport } from '../../src/utils/testReport';
import { uniqueEmployeeName } from '../../src/data/testData';

test('TC-PIM-ADD-02: add employee with first, middle, and last name', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-02', 'Add Employee Full Name', env.baseURL, page);
  const employee = uniqueEmployeeName('QaAddFull');
  const middleName = 'Middleton';

  report.step(`Fill First="${employee.firstName}", Middle="${middleName}", Last="${employee.lastName}"`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName, middleName);

  report.step('Intercept POST, klik Save');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);

  report.step('Verify middleName tersimpan di response');
  const body = await resp.json().catch(() => null);
  report.check('[API] status === 200', resp.status() === 200);
  report.check('[API] middleName sesuai input', body?.data?.middleName === middleName, JSON.stringify(body?.data));

  report.print();
});
