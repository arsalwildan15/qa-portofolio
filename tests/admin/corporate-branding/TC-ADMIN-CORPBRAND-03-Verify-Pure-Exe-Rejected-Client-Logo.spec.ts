/**
 * ================================================================================
 * TC-ADMIN-CORPBRAND-03: Verify Pure Exe Rejected Client Logo
 * Modul    : Admin - Corporate Branding
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-CORPBRAND-03-Verify-Pure-Exe-Rejected-Client-Logo.spec.ts
 * Path     : tests/admin/corporate-branding/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline untuk TC-ADMIN-CORPBRAND-04: membuktikan file .exe dengan
 *   ekstensi ASLI (tidak di-rename) memang ditolak client-side sebagai
 *   Client Logo. [VALIDATE-ONLY] TIDAK pernah klik "Publish" (lihat
 *   SAFETY CONSTRAINT di docs/TC-Admin.txt).
 *
 *   [TEMUAN TEKNIS] Rejection mechanism-nya uncaught exception browser
 *   "The source image cannot be decoded." (lihat TC-ADMIN-CORPBRAND-02),
 *   BUKAN pesan .oxd-text--span biasa -- exception ini SENGAJA dibiarkan
 *   ikut tertangkap console-error check otomatis TestReport (STATUS TC
 *   ini bisa FAILED karena itu, bukan karena bug lain).
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/corporate-branding/TC-ADMIN-CORPBRAND-03-Verify-Pure-Exe-Rejected-Client-Logo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-ADMIN-CORPBRAND-03: an .exe file with its real extension is rejected as a Client Logo (validate-only, no Publish)', async ({
  page,
  adminCorporateBrandingPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-CORPBRAND-03', 'Pure Exe Rejected Client Logo', env.baseURL, page);

  let decodeError: string | null = null;
  page.on('pageerror', (e) => {
    decodeError = e.message;
  });

  report.step('Buka form, pilih file .exe ekstensi asli sbg Client Logo (TIDAK klik Publish)');
  await adminCorporateBrandingPage.goto();
  await page.waitForTimeout(1500);
  await adminCorporateBrandingPage.clientLogoFileInput.setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/x-msdownload',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(800);

  report.step('Verify: file ditolak -- baik via pesan validasi form, baik via gagal decode image preview');
  const error = await adminCorporateBrandingPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const rejected = (error ?? '').trim().length > 0 || (decodeError ?? '').includes('cannot be decoded');
  report.check(
    'File .exe ekstensi asli ditolak sbg Client Logo (pesan validasi ATAU gagal decode image)',
    rejected,
    `fieldError=${error ?? 'tidak ada'}, decodeError=${decodeError ?? 'tidak ada'}`,
  );

  report.print();
});
