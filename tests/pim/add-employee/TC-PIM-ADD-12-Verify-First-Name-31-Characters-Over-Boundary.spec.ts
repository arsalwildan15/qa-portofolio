/**
 * ================================================================================
 * TC-PIM-ADD-12 — Verify First Name 31 Characters Over Boundary [TEMUAN]
 * Modul    : PIM - Add Employee
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-12-Verify-First-Name-31-Characters-Over-Boundary.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi First Name 31 karakter (1 di atas boundary) ditolak
 *   client-side dengan pesan "Should not exceed 30 characters"
 *   (dikonfirmasi langsung — field TIDAK punya atribut HTML maxlength,
 *   validasi murni JS).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-12-Verify-First-Name-31-Characters-Over-Boundary.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-ADD-12: First Name at 31 characters is rejected with length error', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-12', 'First Name 31 Characters Over Boundary', env.baseURL, page);
  const { lastName } = uniqueEmployeeName('x');
  const firstName31 = 'A'.repeat(31);

  report.step('Navigate ke Add Employee, verify input First Name tidak punya atribut maxlength');
  await addEmployeePage.goto();
  const maxlength = await addEmployeePage.firstNameInput.getAttribute('maxlength');
  report.finding('Atribut maxlength pada First Name', `maxlength="${maxlength}" (validasi murni JS, bukan HTML)`);

  report.step('Fill First Name = 31x "A", klik Save');
  await addEmployeePage.fillName(firstName31, lastName);

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });
  await addEmployeePage.save();

  report.step('Verify pesan "Should not exceed 30 characters" muncul dan POST tidak terkirim');
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.check(
    'Pesan "Should not exceed 30 characters" muncul',
    errors.includes('Should not exceed 30 characters'),
    `errors=${JSON.stringify(errors)}`,
  );
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
