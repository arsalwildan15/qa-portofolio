/**
 * ================================================================================
 * TC-ADMIN-CORPBRAND-05: Verify Exe Renamed As Png Login Banner
 * Modul    : Admin - Corporate Branding
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-CORPBRAND-05-Verify-Exe-Renamed-As-Png-Login-Banner.spec.ts
 * Path     : tests/admin/corporate-branding/
 * ================================================================================
 *
 * TUJUAN:
 *   Sama seperti TC-ADMIN-CORPBRAND-04 tapi untuk field Login Banner
 *   (bukan Client Logo), untuk mengecek apakah validasi client-side
 *   konsisten di ketiga file input Corporate Branding.
 *
 *   [VALIDATE-ONLY -- PENTING] TC ini SENGAJA TIDAK pernah klik
 *   "Publish" (lihat SAFETY CONSTRAINT di docs/TC-Admin.txt dan
 *   TC-ADMIN-CORPBRAND-04). Dicatat via report.finding(), bukan hard
 *   check pass/fail tegas.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/corporate-branding/TC-ADMIN-CORPBRAND-05-Verify-Exe-Renamed-As-Png-Login-Banner.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-ADMIN-CORPBRAND-05: whether client-side validation catches an exe renamed to .png as Login Banner (validate-only, no Publish)', async ({
  page,
  adminCorporateBrandingPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-CORPBRAND-05', 'Exe Renamed As Png Login Banner', env.baseURL, page);

  let decodeError: string | null = null;
  page.on('pageerror', (e) => {
    decodeError = e.message;
  });

  report.step('Buka form, pilih file executable yang di-rename jadi .png sbg Login Banner (TIDAK klik Publish)');
  await adminCorporateBrandingPage.goto();
  await page.waitForTimeout(1500);
  await adminCorporateBrandingPage.loginBannerFileInput.setInputFiles({
    name: 'banner-spoofed.png',
    mimeType: 'image/png',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(800);

  report.step('Verify: catat apakah client-side validation (pesan form ATAU gagal decode image) menolak atau lolos (TIDAK sampai Publish)');
  const error = await adminCorporateBrandingPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  const rejected = (error ?? '').trim().length > 0 || (decodeError ?? '').includes('cannot be decoded');
  report.finding(
    'Validasi client-side untuk exe-renamed-.png sbg Login Banner',
    rejected
      ? `DITOLAK client-side sebelum Publish (fieldError="${error ?? 'tidak ada'}", decodeError="${decodeError ?? 'tidak ada'}") -- konsisten dengan Client Logo di TC-ADMIN-CORPBRAND-04`
      : 'TIDAK ADA error client-side setelah pilih file -- berpotensi lolos kalau di-Publish, TAPI TIDAK diverifikasi sampai Publish demi keamanan demo bersama (lihat SAFETY CONSTRAINT)',
  );
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
