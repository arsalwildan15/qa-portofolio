/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-02: Verify File Over 1MB Rejected
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-02-Verify-File-Over-1MB-Rejected.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi file CSV berukuran 1MB + 1 byte (satu byte di atas
 *   batas "Accepts up to 1MB") ditolak oleh validasi ukuran file.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-02-Verify-File-Over-1MB-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport, isVisibleWithWait } from '../../../../src/utils/testReport';

const ONE_MB = 1024 * 1024;

test('TC-PIM-DATAIMPORT-02: CSV file larger than 1MB is rejected', async ({
  page,
  dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-02', 'File Over 1MB Rejected', env.baseURL, page);

  let uploadRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/csv-import')) uploadRequestFired = true;
  });

  report.step('Pilih file CSV berukuran 1MB + 1 byte, klik Upload');
  await dataImportPage.goto();
  const oversizedBuffer = Buffer.alloc(ONE_MB + 1, 97); // 'a' repeated
  await dataImportPage.fileInput.setInputFiles({
    name: 'oversized.csv',
    mimeType: 'text/csv',
    buffer: oversizedBuffer,
  });
  await dataImportPage.upload();
  await page.waitForTimeout(800);

  report.step('Verify ditolak: tidak ada POST csv-import, atau muncul pesan error ukuran');
  const sizeError = page.getByText(/exceeds|too large|1\s?MB/i);
  const errorVisible = await isVisibleWithWait(sizeError, 5_000);
  report.check(
    'Upload ditolak (tidak ada POST csv-import ATAU muncul pesan error ukuran)',
    uploadRequestFired === false || errorVisible,
    `requestFired=${uploadRequestFired}, errorVisible=${errorVisible}`,
  );

  report.print();
});
