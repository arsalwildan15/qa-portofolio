/**
 * ================================================================================
 * TC-PIM-ADD-31: Verify Pure Exe Upload Rejected
 * Modul    : PIM - Add Employee
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-ADD-31-Verify-Pure-Exe-Upload-Rejected.spec.ts
 * Path     : tests/pim/add-employee/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline/kontrol pembanding untuk TC-PIM-ADD-28/29/30: membuktikan
 *   bahwa file executable dengan EKSTENSI ASLI (.exe, tanpa rename/
 *   trik apa pun) memang DITOLAK oleh validasi upload. Ini membuktikan
 *   validasinya tidak sepenuhnya tidak ada, cuma bisa di-bypass dengan
 *   rename ekstensi, bukan tidak pernah divalidasi sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/add-employee/TC-PIM-ADD-31-Verify-Pure-Exe-Upload-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-ADD-31: a .exe file with its real extension is rejected before submit', async ({
  page,
  addEmployeePage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-PIM-ADD-31', 'Pure Exe Upload Rejected', env.baseURL, page);

  let uploadRequestFired = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/pim/employees')) uploadRequestFired = true;
  });

  report.step('Upload file .exe dengan ekstensi asli (tanpa rename)');
  await addEmployeePage.goto();
  await addEmployeePage.fileInput.setInputFiles({
    name: 'malicious.exe',
    mimeType: 'application/octet-stream',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(800);

  report.step('Verify ditolak: muncul pesan error, dan tidak ada POST employees terkirim dari aksi ini');
  const typeError = page.locator('.oxd-input-group .oxd-text--span').first();
  const errorText = await typeError.textContent({ timeout: 2_000 }).catch(() => null);
  report.check(
    'Pesan error "File type not allowed" muncul',
    errorText !== null && /not allowed/i.test(errorText),
    `errorText=${errorText ?? 'tidak ada'}`,
  );
  report.check('Belum ada POST employees terkirim', uploadRequestFired === false);

  report.print();
});
