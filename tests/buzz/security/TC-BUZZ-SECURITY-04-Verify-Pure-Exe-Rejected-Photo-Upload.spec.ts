/**
 * ================================================================================
 * TC-BUZZ-SECURITY-04: Verify Pure Exe Rejected As Photo (Baseline)
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-04-Verify-Pure-Exe-Rejected-Photo-Upload.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline pembanding utk TC-BUZZ-SECURITY-03: file .exe dengan
 *   EKSTENSI ASLI (tanpa rename) harus DITOLAK -- membuktikan validasi
 *   ekstensi memang ADA, bukan sama sekali tidak tervalidasi (konsisten
 *   dengan pola yang sama di PIM/Recruitment/Admin).
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-04-Verify-Pure-Exe-Rejected-Photo-Upload.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-BUZZ-SECURITY-04: a .exe file with its real extension is rejected as a photo', async ({
  page,
  buzzPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-04', 'Pure Exe Rejected Photo Upload', env.baseURL, page);

  report.step('Buka composer, klik Share Photo, upload .exe dengan ekstensi ASLI, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.revealPhotoUpload();
  await page.waitForTimeout(500);
  await buzzPage.fileInput.setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/x-msdownload',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await page
    .locator('.oxd-input-field-error-message, .oxd-text--span')
    .first()
    .textContent({ timeout: 3_000 })
    .catch(() => null);

  let posted = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/buzz/posts')) posted = true;
  });
  await buzzPage.submitPostButton.click().catch(() => {});
  await page.waitForTimeout(2000);

  report.check(
    'File .exe ekstensi asli DITOLAK (error muncul ATAU POST tidak pernah terkirim)',
    errorAfterSelect !== null || !posted,
    `selectError=${errorAfterSelect ?? 'tidak ada'}, postFired=${posted}`,
  );

  report.print();
});
