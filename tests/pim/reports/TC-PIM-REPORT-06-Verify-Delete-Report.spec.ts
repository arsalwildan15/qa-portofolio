/**
 * ================================================================================
 * TC-PIM-REPORT-06: Verify Delete Report
 * Modul    : PIM - Reports
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-06-Verify-Delete-Report.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menghapus report (via icon trash + konfirmasi
 *   "Yes, Delete") berhasil, report tidak lagi muncul di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-06-Verify-Delete-Report.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-REPORT-06: deleting a report removes it from the list', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-06', 'Delete Report', env.baseURL, page);
  const reportName = uniqueName('QaDeleteReport');

  report.step('Buat report baru (Name + Display Field) untuk dihapus');
  await pimReportsPage.gotoAddForm();
  await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
  await pimReportsPage.reportNameInput.fill(reportName);
  await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldGroupSelect, 'Personal');
  await page.waitForTimeout(500);
  await pimReportsPage.selectDropdownOption(pimReportsPage.displayFieldSelect, 'First Name');
  await page.locator('button.orangehrm-report-icon').last().click();
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reports/defined') && r.request().method() === 'POST',
      { timeout: 10_000 },
    ),
    pimReportsPage.save(),
  ]);

  report.step('Verify muncul di list sebelum dihapus');
  await pimReportsPage.goto();
  const row = pimReportsPage.rowByName(reportName);
  await row.waitFor({ state: 'visible', timeout: 10_000 });
  report.check('Report terlihat sebelum delete', await row.isVisible());

  report.step('Hapus via icon trash + konfirmasi "Yes, Delete"');
  const [deleteResp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/pim/reports/defined') && r.request().method() === 'DELETE',
      { timeout: 10_000 },
    ),
    pimReportsPage.deleteRow(row),
  ]);
  report.check('[API] status === 200', deleteResp.status() === 200, `status=${deleteResp.status()}`);

  report.step('Verify tidak lagi muncul di list');
  await pimReportsPage.goto();
  const stillVisible = await pimReportsPage.rowByName(reportName).isVisible().catch(() => false);
  report.check('Report sudah tidak terlihat setelah delete', stillVisible === false);

  report.print();
});
