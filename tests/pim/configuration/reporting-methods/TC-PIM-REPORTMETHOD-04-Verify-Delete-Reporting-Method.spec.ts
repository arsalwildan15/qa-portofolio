/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-04: Verify Delete Reporting Method
 * Modul    : PIM - Configuration - Reporting Methods
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-04-Verify-Delete-Reporting-Method.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus Reporting Method (via icon trash + konfirmasi
 *   "Yes, Delete") berhasil, tidak lagi muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-04-Verify-Delete-Reporting-Method.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';
import { uniqueName } from '../../../../src/data/testData';

test('TC-PIM-REPORTMETHOD-04: deleting a reporting method removes it from the list', async ({
  page,
  reportingMethodsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-04', 'Delete Reporting Method', env.baseURL, page);
  const name = uniqueName('QaDeleteMethod');

  report.step('Buat reporting method baru untuk dihapus');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.nameInput.fill(name);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reporting-methods') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    reportingMethodsPage.save(),
  ]);

  report.step('Verify muncul di list sebelum dihapus');
  await reportingMethodsPage.goto();
  const row = reportingMethodsPage.rowByName(name);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Method terlihat sebelum delete', await row.isVisible());

  report.step('Hapus via icon trash + konfirmasi "Yes, Delete"');
  const [deleteResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reporting-methods') && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    ),
    reportingMethodsPage.deleteRow(row),
  ]);
  report.check('[API] status === 200', deleteResp.status() === 200, `status=${deleteResp.status()}`);

  report.step('Verify tidak lagi muncul di list');
  await reportingMethodsPage.goto();
  const stillVisible = await reportingMethodsPage.rowByName(name).isVisible().catch(() => false);
  report.check('Method sudah tidak terlihat setelah delete', stillVisible === false);

  report.print();
});
