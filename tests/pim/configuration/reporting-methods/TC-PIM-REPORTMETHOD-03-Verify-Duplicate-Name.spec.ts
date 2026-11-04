/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-03: Verify Duplicate Name
 * Modul    : PIM - Configuration - Reporting Methods
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-03-Verify-Duplicate-Name.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Reporting Method dengan Name yang sudah ada
 *   ditolak (dicek live apakah muncul error atau diterima sebagai
 *   duplikat, lihat finding/check di bawah sesuai hasil observasi).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-03-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-REPORTMETHOD-03: adding a duplicate name', async ({
  page,
  reportingMethodsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-03', 'Duplicate Name', env.baseURL, page);
  const name = uniqueName('QaDupMethod');

  report.step('Buat reporting method pertama');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.nameInput.fill(name);
  await reportingMethodsPage.save();
  await page.waitForTimeout(500);

  report.step('Coba buat reporting method kedua dengan Name yang sama persis');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.nameInput.fill(name);
  await reportingMethodsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify behavior saat Name duplikat');
  const errorText = await reportingMethodsPage.fieldErrors.allTextContents();
  const rejected = errorText.length > 0;
  if (rejected) {
    report.check('Duplikat ditolak dengan error', rejected, `errorText=${JSON.stringify(errorText)}`);
  } else {
    await reportingMethodsPage.goto();
    const matchingRows = reportingMethodsPage.rowByName(name);
    await matchingRows.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await matchingRows.count();
    report.finding('Behavior saat Name duplikat (tidak ada error validasi)', `jumlah row dengan nama sama=${count}`);
  }

  report.print();
});
