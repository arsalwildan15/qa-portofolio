/**
 * ================================================================================
 * TC-PIM-ADD-14 — Verify Employee Id 11 Characters Over Boundary [TEMUAN]
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-14-Verify-Employee-Id-11-Characters-Over-Boundary.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Employee Id 11 karakter (1 di atas boundary) ditolak
 *   client-side dengan "Should not exceed 10 characters" (dikonfirmasi
 *   langsung — ini adalah boundary ASLI field ini, bukan 255 seperti
 *   username Login).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-14-Verify-Employee-Id-11-Characters-Over-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-14: Employee Id at 11 characters is rejected with length error', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-14', 'Employee Id 11 Characters Over Boundary', env.baseURL, page);
  const employee = uniqueEmployeeName('QaId11');
  const employeeId11 = `ID${Date.now().toString().slice(-9)}`; // 11 chars

  report.step(`Navigate ke Add Employee, fill nama, set Employee Id = "${employeeId11}" (11 char)`);
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  await addEmployeePage.employeeIdInput.fill(employeeId11);

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify "Should not exceed 10 characters" muncul dan POST tidak terkirim');
  await addEmployeePage.save();
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.check(
    'Pesan "Should not exceed 10 characters" muncul',
    errors.includes('Should not exceed 10 characters'),
    `errors=${JSON.stringify(errors)}`,
  );
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
