/**
 * ================================================================================
 * TC-PIM-CONTACT-02 — Verify Save With All Fields Empty Succeeds
 * Modul    : PIM - Contact Details
 * Kategori : Edge Case (!) [TEMUAN]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-02-Verify-Save-With-All-Fields-Empty-Succeeds.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save tanpa mengisi satu field pun TIDAK memicu
 *   validasi apa pun — seluruh field Contact Details bersifat opsional
 *   (dikonfirmasi langsung: empty save -> 0 error, PUT tetap 200).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-02-Verify-Save-With-All-Fields-Empty-Succeeds.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-02: save with all fields empty succeeds', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-02', 'Save With All Fields Empty Succeeds', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactEmpty');

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step('Langsung klik Save tanpa mengisi field apapun');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);

  report.step('Verify save sukses tanpa validasi required');
  report.check('[API] status === 200 (tidak ada field wajib)', resp.status() === 200, `status=${resp.status()}`);
  const errorCount = await contactDetailsPage.fieldErrors.count();
  report.check('count(.oxd-text--span error) === 0', errorCount === 0, `count=${errorCount}`);

  report.finding(
    'Semua field Contact Details opsional',
    'Berbeda dari Add Employee (First/Last Name wajib), Contact Details tidak punya field wajib sama sekali — save kosong tetap 200.',
  );

  report.print();
});
