/**
 * ================================================================================
 * TC-ADMIN-CORPBRAND-02: Verify Txt File Rejected Client Logo
 * Modul    : Admin - Corporate Branding
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-CORPBRAND-02-Verify-Txt-File-Rejected-Client-Logo.spec.ts
 * Path     : tests/admin/corporate-branding/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi file .txt ditolak sebagai Client Logo. [VALIDATE-ONLY]
 *   TC ini SENGAJA TIDAK pernah klik "Publish" -- "Publish" mengubah
 *   theme GLOBAL yang dilihat semua user demo publik, bukan cuma
 *   membuat 1 record uji. Validasi diuji sampai titik setelah file
 *   dipilih saja (lihat SAFETY CONSTRAINT di docs/TC-Admin.txt).
 *
 *   [TEMUAN TEKNIS] Rejection mechanism-nya BUKAN pesan .oxd-text--span
 *   seperti sub-screen lain, tapi uncaught exception browser "The source
 *   image cannot be decoded." -- dikonfirmasi live: komponen file input
 *   ini langsung mencoba decode file sebagai image asli untuk preview,
 *   dan gagal (throw) kalau isinya bukan image valid. Exception ini
 *   SENGAJA dibiarkan ikut tertangkap oleh console-error check otomatis
 *   TestReport (STATUS TC ini akan FAILED karena itu, bukan karena bug
 *   lain) -- itu justru BUKTI bahwa file ditolak di level decode, bukan
 *   di level pesan validasi form biasa.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/corporate-branding/TC-ADMIN-CORPBRAND-02-Verify-Txt-File-Rejected-Client-Logo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-CORPBRAND-02: a .txt file is rejected as a Client Logo (validate-only, no Publish)', async ({
  page,
  adminCorporateBrandingPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-CORPBRAND-02', 'Txt File Rejected Client Logo', env.baseURL, page);

  let decodeError: string | null = null;
  page.on('pageerror', (e) => {
    decodeError = e.message;
  });

  report.step('Buka form, pilih file .txt sbg Client Logo (TIDAK klik Publish)');
  await adminCorporateBrandingPage.goto();
  await page.waitForTimeout(1500);
  await adminCorporateBrandingPage.clientLogoFileInput.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('plain text content, not an image'),
  });
  await page.waitForTimeout(800);

  report.step('Verify: file ditolak -- baik via pesan validasi form, baik via gagal decode image preview');
  const error = await adminCorporateBrandingPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const rejected = (error ?? '').trim().length > 0 || (decodeError ?? '').includes('cannot be decoded');
  report.check(
    'File .txt ditolak sbg Client Logo (pesan validasi ATAU gagal decode image)',
    rejected,
    `fieldError=${error ?? 'tidak ada'}, decodeError=${decodeError ?? 'tidak ada'}`,
  );

  report.print();
});
