/**
 * ================================================================================
 * TC-PIM-CONTACT-04 — Verify Street1 Very Long Text
 * Modul    : PIM - Contact Details
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-04-Verify-Street1-Very-Long-Text.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Street 1 dengan teks sangat panjang (500 karakter) tidak
 *   membuat server crash — diterima (<500) atau ditolak dengan validasi,
 *   tapi tidak pernah 5xx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-04-Verify-Street1-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-04: street1 with 500 characters does not crash the server', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-04', 'Street1 Very Long Text', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactLong');

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step('Fill Street 1 = 500x "a", klik Save');
  await contactDetailsPage.street1Input.fill('a'.repeat(500));
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);

  report.step('Verify server tidak crash');
  report.check('[API] status < 500', resp.status() < 500, `status=${resp.status()}`);

  report.print();
});
