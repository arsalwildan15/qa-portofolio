/**
 * ================================================================================
 * TC-PIM-CONTACT-07 — Verify Unsaved Navigation No Warning
 * Modul    : PIM - Contact Details
 * Kategori : Edge Case (!) [TEMUAN]
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-CONTACT-07-Verify-Unsaved-Navigation-No-Warning.spec.ts
 * Path     : tests/pim/contact-details/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan temuan: mengisi field Contact Details lalu navigasi
 *   pindah tab tanpa Save TIDAK memunculkan warning dialog apapun — data
 *   hilang diam-diam (sama seperti temuan TC-PIM-ADD-25 di Add Employee).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/contact-details/TC-PIM-CONTACT-07-Verify-Unsaved-Navigation-No-Warning.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName } from '../../../src/data/testData';

test('TC-PIM-CONTACT-07: navigating away with unsaved input shows no warning', async ({
  page,
  addEmployeePage,
  contactDetailsPage,
  jobPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-CONTACT-07', 'Unsaved Navigation No Warning', env.baseURL, page);
  const employee = uniqueEmployeeName('QaContactNav');

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Contact Details, isi Street 1 tanpa Save');
  await addEmployeePage.goto();
  await addEmployeePage.fillName(employee.firstName, employee.lastName);
  const [addResp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/pim/employees') && r.request().method() === 'POST'),
    addEmployeePage.save(),
  ]);
  const empNumber = (await addResp.json()).data.empNumber;
  await contactDetailsPage.goto(empNumber);
  await contactDetailsPage.street1Input.fill('Alamat belum disimpan');

  report.step('Navigate ke tab Job (bukan Save) tanpa menyimpan');
  await jobPage.goto(empNumber);
  await page.waitForTimeout(500);

  report.step('Verify tidak ada warning dialog, navigasi berhasil');
  report.check('Tidak ada dialog warning yang terpicu', dialogFired === false);
  report.check('URL berpindah ke Job', /viewJobDetails/.test(page.url()));

  report.finding(
    'Navigasi dengan unsaved input tidak ada warning',
    'Sama seperti Add Employee (TC-PIM-ADD-25), pindah tab tanpa Save tidak memicu konfirmasi apapun — data yang diisi hilang diam-diam.',
  );

  report.print();
});
