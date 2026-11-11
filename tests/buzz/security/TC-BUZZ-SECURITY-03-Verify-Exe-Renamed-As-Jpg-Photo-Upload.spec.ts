/**
 * ================================================================================
 * TC-BUZZ-SECURITY-03: Verify Exe Renamed As Jpg Accepted Via Share Photo
 * Modul    : Buzz - Security
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-BUZZ-SECURITY-03-Verify-Exe-Renamed-As-Jpg-Photo-Upload.spec.ts
 * Path     : tests/buzz/security/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi apakah upload foto via "Share Photo" di Buzz rentan
 *   terhadap pola bug yang SAMA PERSIS sudah dikonfirmasi 4x di modul
 *   lain (PIM Add Employee, PIM Personal Details, Recruitment Resume,
 *   Admin Job Title/Corporate Branding): validasi hanya cek EKSTENSI
 *   nama file, bukan konten/magic bytes. Discovery awal mengonfirmasi
 *   input[type=file] di Buzz TIDAK PUNYA atribut `accept=` pembatas
 *   tipe file sama sekali.
 *
 *   DAMPAK kalau bug ini reproduce: file berbahaya ter-broadcast ke
 *   SELURUH karyawan via feed Buzz (bukan cuma 1 record employee/
 *   candidate seperti modul lain) -- blast radius PALING LUAS di
 *   seluruh aplikasi kalau dikonfirmasi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/buzz/security/TC-BUZZ-SECURITY-03-Verify-Exe-Renamed-As-Jpg-Photo-Upload.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-BUZZ-SECURITY-03: an executable renamed to .jpg via Share Photo', async ({ page, buzzPage }, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-BUZZ-SECURITY-03', 'Exe Renamed As Jpg Photo Upload', env.baseURL, page);

  report.step('Buka composer, klik Share Photo, upload exe yang di-rename .jpg, submit');
  await buzzPage.goto();
  await buzzPage.openComposer();
  await buzzPage.revealPhotoUpload();
  await page.waitForTimeout(500);
  await buzzPage.fileInput.setInputFiles({
    name: 'photo-spoofed.jpg',
    mimeType: 'image/jpeg',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await page
    .locator('.oxd-input-field-error-message, .oxd-text--span')
    .first()
    .textContent({ timeout: 2_000 })
    .catch(() => null);

  // NOTE 2026-11-11: default submitTextPost() 15s waitForResponse timeout was too tight for
  // an upload + flaky public demo -- a timeout was silently treated as "no response = pass",
  // a false-pass. Widened to 30s and made the no-response case an explicit INCONCLUSIVE
  // finding instead of an automatic pass, per project rule: no false positive/false passed.
  await buzzPage.postTextarea.fill('QaBuzzExePhoto');
  const resp = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v2/buzz/posts') && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    buzzPage.submitPostButton.click(),
  ]).then(([r]) => r).catch(() => null);

  if (resp === null) {
    report.finding(
      'Submit tidak menghasilkan response /api/v2/buzz/posts dalam 30s (INCONCLUSIVE, bukan pass otomatis)',
      `selectError=${errorAfterSelect ?? 'tidak ada'}`,
    );
  } else {
    report.check(
      'File executable di-rename .jpg SEHARUSNYA ditolak, tapi kalau diterima (POST 200) itu BUG',
      resp.status() !== 200,
      `status=${resp.status()}, selectError=${errorAfterSelect ?? 'tidak ada'}`,
    );
  }

  report.print();
});
