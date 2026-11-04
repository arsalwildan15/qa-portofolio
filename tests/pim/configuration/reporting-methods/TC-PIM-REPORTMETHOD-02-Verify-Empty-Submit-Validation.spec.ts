/**
 * ================================================================================
 * TC-PIM-REPORTMETHOD-02: Verify Empty Submit Validation
 * Modul    : PIM - Configuration - Reporting Methods
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-REPORTMETHOD-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/pim/configuration/reporting-methods/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit modal Add Reporting Method kosong menampilkan
 *   validasi required, request simpan tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/reporting-methods/TC-PIM-REPORTMETHOD-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-REPORTMETHOD-02: empty submit shows required validation', async ({
  page,
  reportingMethodsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-REPORTMETHOD-02', 'Empty Submit Validation', env.baseURL, page);

  let saveRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('reporting-methods')) saveRequestFired = true;
  });

  report.step('Buka Reporting Methods, klik Add, langsung klik Save tanpa isi apapun');
  await reportingMethodsPage.goto();
  await reportingMethodsPage.addButton.click();
  await reportingMethodsPage.nameInput.waitFor({ state: 'visible' });
  await reportingMethodsPage.save();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan save tidak terkirim');
  const errorCount = await reportingMethodsPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST reporting-methods TIDAK terkirim', saveRequestFired === false);

  report.print();
});
