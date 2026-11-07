/**
 * ================================================================================
 * TC-ADMIN-CORPBRAND-04: Verify Exe Renamed As Png Client Logo
 * Modul    : Admin - Corporate Branding
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-CORPBRAND-04-Verify-Exe-Renamed-As-Png-Client-Logo.spec.ts
 * Path     : tests/admin/corporate-branding/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan apakah CLIENT-SIDE validation menolak file
 *   executable (header PE "MZ") yang di-rename jadi .png sbg Client
 *   Logo, dengan cara yang sama seperti TC-PIM-ADD-28/TC-ADMIN-
 *   JOBTITLE-07 (bug pattern yang sama: validasi ekstensi vs konten).
 *
 *   [VALIDATE-ONLY -- PENTING] TC ini SENGAJA TIDAK pernah klik
 *   "Publish" -- "Publish" di Corporate Branding mengubah THEME GLOBAL
 *   yang dilihat SEMUA user demo publik ini, berbeda dari Save di
 *   Job Title/Pay Grade yang cuma membuat 1 record uji baru. Karena itu
 *   hasil TC ini TIDAK bisa membuktikan perilaku server-side secara
 *   pasti (server bisa saja punya validasi konten tambahan yang baru
 *   jalan saat Publish), jadi dicatat via report.finding() (bukan hard
 *   check pass/fail tegas) -- apakah client-side validation lolos atau
 *   tidak sampai sebelum Publish.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/corporate-branding/TC-ADMIN-CORPBRAND-04-Verify-Exe-Renamed-As-Png-Client-Logo.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-ADMIN-CORPBRAND-04: whether client-side validation catches an exe renamed to .png as Client Logo (validate-only, no Publish)', async ({
  page,
  adminCorporateBrandingPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-CORPBRAND-04', 'Exe Renamed As Png Client Logo', env.baseURL, page);

  let decodeError: string | null = null;
  page.on('pageerror', (e) => {
    decodeError = e.message;
  });

  report.step('Buka form, pilih file executable yang di-rename jadi .png sbg Client Logo (TIDAK klik Publish)');
  await adminCorporateBrandingPage.goto();
  await page.waitForTimeout(1500);
  await adminCorporateBrandingPage.clientLogoFileInput.setInputFiles({
    name: 'logo-spoofed.png',
    mimeType: 'image/png',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(800);

  report.step('Verify: catat apakah client-side validation (pesan form ATAU gagal decode image) menolak atau lolos (TIDAK sampai Publish)');
  const error = await adminCorporateBrandingPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const rejected = (error ?? '').trim().length > 0 || (decodeError ?? '').includes('cannot be decoded');
  report.finding(
    'Validasi client-side untuk exe-renamed-.png sbg Client Logo',
    rejected
      ? `DITOLAK client-side sebelum Publish (fieldError="${error ?? 'tidak ada'}", decodeError="${decodeError ?? 'tidak ada'}") -- BERBEDA dari TC-ADMIN-JOBTITLE-07: field upload Corporate Branding mencoba decode file sebagai image NYATA (bukan cuma cek ekstensi), jadi rename .png TIDAK cukup untuk bypass di sini`
      : 'TIDAK ADA error client-side setelah pilih file -- berpotensi lolos kalau di-Publish, TAPI TIDAK diverifikasi sampai Publish demi keamanan demo bersama (lihat SAFETY CONSTRAINT)',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
