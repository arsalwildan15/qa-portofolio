/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-03: Verify Wrong File Type Rejected
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-03-Verify-Wrong-File-Type-Rejected.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi file dengan tipe selain CSV (image/png) ditolak saat
 *   di-upload ke Data Import.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-03-Verify-Wrong-File-Type-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../../src/utils/testReport';

test('TC-PIM-DATAIMPORT-03: a PNG file is rejected by Data Import', async ({
  page,
  dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-03', 'Wrong File Type Rejected', env.baseURL, page);

  let uploadRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/csv-import')) uploadRequestFired = true;
  });

  report.step('Pilih file PNG (bukan CSV), klik Upload');
  await dataImportPage.goto();
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  await dataImportPage.fileInput.setInputFiles({
    name: 'not-a-csv.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });
  await dataImportPage.upload();
  await page.waitForTimeout(800);

  report.step('Verify ditolak: tidak ada POST csv-import, atau muncul pesan error format');
  const typeError = page.getByText(/invalid|not.*supported|csv/i);
  const errorVisible = await isVisibleWithWait(typeError, 5_000);
  report.check(
    'Upload ditolak (tidak ada POST csv-import ATAU muncul pesan error format)',
    uploadRequestFired === false || errorVisible,
    `requestFired=${uploadRequestFired}, errorVisible=${errorVisible}`,
  );

  report.print();
});
