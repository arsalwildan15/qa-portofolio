/**
 * ================================================================================
 * TC-PIM-CONTACT-03 — Verify Invalid Email Format Not Validated
 * Modul    : PIM - Contact Details
 * Kategori : Negative (-) [TEMUAN]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-03-Verify-Invalid-Email-Format-Not-Validated.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan temuan: Work Email TIDAK divalidasi format-nya sama
 *   sekali client-side — string "not-an-email" tersimpan tanpa error
 *   (dikonfirmasi langsung sebelum TC ini ditulis).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-03-Verify-Invalid-Email-Format-Not-Validated.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-03: invalid email format is not validated', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-03', 'Invalid Email Format Not Validated', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactEmail');

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step('Fill Work Email = "not-an-email" (format tidak valid), klik Save');
  await contactDetailsPage.workEmailInput.fill('not-an-email');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);

  report.step('Verify tidak ada validasi format email');
  report.check('[API] status === 200 (email invalid tetap diterima)', resp.status() === 200, `status=${resp.status()}`);
  const errorCount = await contactDetailsPage.fieldErrors.count();
  report.check('count(error) === 0', errorCount === 0, `count=${errorCount}`);

  report.finding(
    'Work Email tanpa validasi format',
    'String "not-an-email" (bukan format email valid) diterima dan disimpan tanpa error apapun.',
  );

  report.print();
});
