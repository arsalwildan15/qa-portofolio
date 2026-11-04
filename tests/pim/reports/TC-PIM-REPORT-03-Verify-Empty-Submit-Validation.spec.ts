/**
 * ================================================================================
 * TC-PIM-REPORT-03: Verify Empty Submit Validation
 * Modul    : PIM - Reports
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORT-03-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/reports/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Save di form Add Report tanpa isi Report Name
 *   menampilkan validasi "Required", request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/reports/TC-PIM-REPORT-03-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-PIM-REPORT-03: empty submit shows required validation for Report Name', async ({
  page,
  pimReportsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORT-03', 'Empty Submit Validation', env.baseURL, page);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/reports/defined')) saveRequestFired = true;
  });

  report.step('Buka form Add Report, langsung klik Save tanpa isi apapun');
  await pimReportsPage.gotoAddForm();
  await pimReportsPage.reportNameInput.waitFor({ state: 'visible' });
  await pimReportsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi "Required" muncul dan save tidak terkirim');
  const errorCount = await pimReportsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST reports/defined TIDAK terkirim', saveRequestFired === false);

  report.print();
});
