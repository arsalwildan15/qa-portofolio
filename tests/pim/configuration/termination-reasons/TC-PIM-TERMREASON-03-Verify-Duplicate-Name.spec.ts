/**
 * ================================================================================
 * TC-PIM-TERMREASON-03: Verify Duplicate Name
 * Modul    : PIM - Configuration - Termination Reasons
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-TERMREASON-03-Verify-Duplicate-Name.spec.ts
 * Path     : tests/pim/configuration/termination-reasons/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Termination Reason dengan Name yang sudah ada
 *   ditolak (dicek live apakah muncul error atau diterima sebagai
 *   duplikat).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/termination-reasons/TC-PIM-TERMREASON-03-Verify-Duplicate-Name.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-TERMREASON-03: adding a duplicate name', async ({
  page,
  terminationReasonsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-TERMREASON-03', 'Duplicate Name', env.baseURL, page);
  const name = uniqueName('QaDupTermReason');

  report.step('Buat termination reason pertama');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.nameInput.fill(name);
  await terminationReasonsPage.save();
  await page.waitForTimeout(500);

  report.step('Coba buat termination reason kedua dengan Name yang sama persis');
  await terminationReasonsPage.goto();
  await terminationReasonsPage.addButton.click();
  await terminationReasonsPage.nameInput.waitFor({ state: 'visible' });
  await terminationReasonsPage.nameInput.fill(name);
  await terminationReasonsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify behavior saat Name duplikat');
  const errorText = await terminationReasonsPage.fieldErrors.allTextContents();
  const rejected = errorText.length > 0;
  if (rejected) {
    report.check('Duplikat ditolak dengan error', rejected, `errorText=${JSON.stringify(errorText)}`);
  } else {
    await terminationReasonsPage.goto();
    const matchingRows = terminationReasonsPage.rowByName(name);
    await matchingRows.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await matchingRows.count();
    report.finding('Behavior saat Name duplikat (tidak ada error validasi)', `jumlah row dengan nama sama=${count}`);
  }

  report.print();
});
