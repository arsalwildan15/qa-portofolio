/**
 * ================================================================================
 * TC-PIM-REPORT-05: Verify Cancel Discards Form
 * Modul    : PIM - Reports
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-05-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi mengisi Report Name lalu klik Cancel kembali ke list
 *   Reports tanpa menyimpan apa pun (report tidak muncul di list).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-05-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-PIM-REPORT-05: clicking Cancel discards the form without saving', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-05', 'Cancel Discards Form', env.baseURL, page);
  const reportName = uniqueName('QaCancelReport');

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/reports/defined')) saveRequestFired = true;
  });

  report.step('Isi Report Name, klik Cancel (bukan Save)');
  await pimReportsPage.gotoAddForm();
  await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
  await pimReportsPage.reportNameInput.fill(reportName);
  await pimReportsPage.cancelButton.click();
  await page.waitForTimeout(800);

  report.step('Verify kembali ke list Reports dan report TIDAK tersimpan');
  report.check('URL kembali ke Reports list', page.url().includes('viewDefinedPredefinedReports'), page.url());
  report.check('POST reports/defined TIDAK terkirim', saveRequestFired === false);
  const row = pimReportsPage.rowByName(reportName);
  const notSaved = await row.isVisible({ timeout: 3_000 }).catch(() => false);
  report.check('Report tidak muncul di list (tidak tersimpan)', notSaved === false);

  report.print();
});
