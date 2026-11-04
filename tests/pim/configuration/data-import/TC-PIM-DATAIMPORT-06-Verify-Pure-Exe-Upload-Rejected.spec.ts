/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-06: Verify Pure Exe Upload Rejected
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-06-Verify-Pure-Exe-Upload-Rejected.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline/kontrol pembanding untuk TC-PIM-DATAIMPORT-05: membuktikan
 *   file .exe dengan ekstensi ASLI (tanpa rename) memang ditolak oleh
 *   Data Import, sama seperti TC-PIM-ADD-31 untuk foto profil.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-06-Verify-Pure-Exe-Upload-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-DATAIMPORT-06: a .exe file with its real extension is rejected by Data Import', async ({
  page,
  dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-06', 'Pure Exe Upload Rejected', env.baseURL, page);

  report.step('Upload file .exe dengan ekstensi asli (tanpa rename)');
  await dataImportPage.goto();
  await dataImportPage.fileInput.setInputFiles({
    name: 'malicious.exe',
    mimeType: 'application/octet-stream',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(800);

  report.step('Verify ditolak: muncul pesan error "File type not allowed"');
  const errorText = await page.locator('.oxd-input-group .oxd-text--span').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check(
    'Pesan error "File type not allowed" muncul',
    errorText !== null && /not allowed/i.test(errorText),
    `errorText=${errorText ?? 'tidak ada'}`,
  );

  report.print();
});
