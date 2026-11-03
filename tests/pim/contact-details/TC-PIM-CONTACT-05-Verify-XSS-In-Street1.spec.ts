/**
 * ================================================================================
 * TC-PIM-CONTACT-05 — Verify XSS In Street1
 * Modul    : PIM - Contact Details
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-05-Verify-XSS-In-Street1.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Street 1 tidak pernah tereksekusi (tidak
 *   ada dialog alert() terpicu) baik saat disimpan maupun saat halaman
 *   di-reload menampilkan data tersimpan.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-05-Verify-XSS-In-Street1.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-05: XSS payload in Street1 is not executed', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-05', 'XSS In Street1', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactXss');

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Contact Details');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);

  report.step(`Fill Street 1 = "<script>alert('xss')</script>", klik Save, lalu reload halaman`);
  await contactDetailsPage.street1Input.fill("<script>alert('xss')</script>");
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/contact-details') && r.request().method() === 'PUT'),
    contactDetailsPage.save(),
  ]);
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() dan tidak ada <script> hidup di DOM');
  report.check('[API] save sukses (status < 500)', resp.status() < 500, `status=${resp.status()}`);
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);
  const liveScriptCount = await page.locator("script:has-text(\"alert('xss')\")").count();
  report.check('count(script:has-text(alert)) === 0', liveScriptCount === 0);

  report.print();
});
