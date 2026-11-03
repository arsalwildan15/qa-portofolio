/**
 * ================================================================================
 * TC-PIM-ADD-06 — Verify Empty Last Name Validation
 * Modul    : PIM - Add Employee
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-06-Verify-Empty-Last-Name-Validation.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit tanpa Last Name (hanya First Name) menampilkan
 *   validasi "Required" dan POST tidak pernah terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-06-Verify-Empty-Last-Name-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-PIM-ADD-06: empty Last Name shows required validation', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-06', 'Empty Last Name Validation', env.baseURL, page);

  report.step('Navigate ke Add Employee, isi First Name saja, biarkan Last Name kosong');
  await addEmployeePage.goto();
  await addEmployeePage.firstNameInput.fill('OnlyFirstName');

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify validasi Required muncul dan POST tidak terkirim');
  await addEmployeePage.save();
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.check('Ada pesan "Required"', errors.includes('Required'), `errors=${JSON.stringify(errors)}`);
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
