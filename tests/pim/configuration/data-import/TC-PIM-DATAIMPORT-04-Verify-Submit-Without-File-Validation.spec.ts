/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-04: Verify Submit Without File Validation
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-04-Verify-Submit-Without-File-Validation.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Upload tanpa memilih file menampilkan validasi
 *   required, request upload tidak terkirim.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-04-Verify-Submit-Without-File-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

test('TC-PIM-DATAIMPORT-04: clicking Upload without a file shows required validation', async ({
  page,
  dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-04', 'Submit Without File Validation', env.baseURL, page);

  let uploadRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/csv-import')) uploadRequestFired = true;
  });

  report.step('Buka Data Import, langsung klik Upload tanpa pilih file');
  await dataImportPage.goto();
  await dataImportPage.upload();
  await page.waitForTimeout(800);

  report.step('Verify validasi muncul dan upload tidak terkirim');
  const errorCount = await dataImportPage.fieldErrors.count();
  report.check('count(error) > 0', errorCount > 0, `count=${errorCount}`);
  report.check('POST csv-import TIDAK terkirim', uploadRequestFired === false);

  report.print();
});
