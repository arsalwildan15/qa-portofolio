/**
 * ================================================================================
 * TC-PIM-ADD-07 — Verify Whitespace Only Name Shows Validation
 * Modul    : PIM - Add Employee
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-07-Verify-Whitespace-Only-Name-Shows-Validation.spec.ts
 * Path     : tests/pim/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi First Name dan Last Name berisi spasi saja ("   ")
 *   di-trim client-side menjadi kosong, menghasilkan 2x pesan "Required"
 *   (dikonfirmasi langsung) dan POST tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/TC-PIM-ADD-07-Verify-Whitespace-Only-Name-Shows-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../src/fixtures/pages.fixture';
import { env } from '../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../src/utils/testReport';

test('TC-PIM-ADD-07: whitespace-only First and Last Name shows two Required errors', async ({
  page,
  addEmployeePage,
}) => {
  const report = new TestReport('TC-PIM-ADD-07', 'Whitespace Only Name Shows Validation', env.baseURL, page);

  report.step('Navigate ke Add Employee, fill First Name = "   ", Last Name = "   "');
  await addEmployeePage.goto();
  await addEmployeePage.fillName('   ', '   ');

  let submitted = false;
  page.on('request', (req) => {
    if (req.url().includes('/api/v2/pim/employees') && req.method() === 'POST') submitted = true;
  });

  report.step('Klik Save, verify 2x "Required" muncul dan POST tidak terkirim');
  await addEmployeePage.save();
  await isVisibleWithWait(addEmployeePage.fieldErrors.first());
  const errors = await addEmployeePage.fieldErrors.allTextContents();
  report.check(
    'Tepat 2 pesan "Required"',
    errors.filter((e) => e === 'Required').length === 2,
    `errors=${JSON.stringify(errors)}`,
  );
  report.check('POST TIDAK terkirim', submitted === false);

  report.print();
});
