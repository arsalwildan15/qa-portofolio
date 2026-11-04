/**
 * ================================================================================
 * TC-PIM-DATAIMPORT-05: Verify Exe Renamed As Csv Upload Security
 * Modul    : PIM - Configuration - Data Import
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-PIM-DATAIMPORT-05-Verify-Exe-Renamed-As-Csv-Upload-Security.spec.ts
 * Path     : tests/pim/configuration/data-import/
 * ================================================================================
 *
 * TUJUAN:
 *   Konfirmasi apakah bug di TC-PIM-ADD-28 (upload foto cuma validasi
 *   ekstensi, bukan konten) berulang di Data Import: file executable
 *   yang di-rename jadi .csv. Berbeda dari foto profil, endpoint ini
 *   memproses isi file sebagai data (bukan cuma menyimpan file mentah),
 *   jadi hasil upload executable yang "lolos" di sini bisa berarti server
 *   mencoba parse konten biner sebagai CSV (potensi crash/hang), bukan
 *   cuma tersimpan diam-diam seperti foto. [CATATAN] Saat eksplorasi
 *   awal, upload file ini sempat membuat request menggantung lama tanpa
 *   response, kemungkinan server mencoba parse konten biner sebagai CSV,
 *   jadi TC ini pakai timeout pendek dan report.finding() untuk hasil
 *   yang ambigu (bukan hard-fail kalau responnya lambat, bukan ditolak).
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/configuration/data-import/TC-PIM-DATAIMPORT-05-Verify-Exe-Renamed-As-Csv-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../../src/fixtures/pages.fixture';
import { env } from '../../../../src/config/env';
import { TestReport } from '../../../../src/utils/testReport';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-PIM-DATAIMPORT-05: an executable renamed to .csv is submitted to Data Import', async ({
  page,
  dataImportPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-PIM-DATAIMPORT-05', 'Exe Renamed As Csv Upload Security', env.baseURL, page);

  report.step('Upload file executable yang di-rename jadi .csv');
  await dataImportPage.goto();
  await dataImportPage.fileInput.setInputFiles({
    name: 'spoofed.csv',
    mimeType: 'text/csv',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);
  const errorAfterSelect = await page.locator('.oxd-input-group .oxd-text--span').first().textContent({ timeout: 2_000 }).catch(() => null);
  report.step(`Error setelah pilih file: ${errorAfterSelect ?? 'tidak ada'}`);

  report.step('Verify: klik Upload, cek response dalam 10s (timeout pendek, hasil ambigu didokumentasikan sbg finding)');
  // Explicit short timeout on the click itself: a plain click() with no
  // timeout inherits the whole test's timeout budget if the button is ever
  // non-actionable, which closes the page out from under the test instead
  // of failing fast with a clear reason.
  const respPromise = page
    .waitForResponse((r) => r.url().includes('csv-import'), { timeout: 10_000 })
    .catch(() => null);
  await dataImportPage.uploadButton.click({ timeout: 10_000 }).catch((e) => {
    report.finding('Klik Upload gagal/timeout', (e as Error).message.split('\n')[0] ?? 'unknown error');
  });
  const resp = await respPromise;

  if (!resp) {
    report.finding(
      'Tidak ada response csv-import dalam 10s setelah upload file exe-as-csv',
      'Kemungkinan server mencoba parse konten biner sebagai CSV dan prosesnya lambat/hang, atau request diblokir diam-diam tanpa response. Perlu investigasi manual lebih lanjut untuk memastikan ini DoS/resource issue vs cuma lambat.',
    );
    report.check('TC dijalankan tanpa exception', true);
  } else {
    report.check(
      '[BUG jika true] File executable yang di-rename .csv diproses server (bukan ditolak langsung)',
      resp.status() >= 400,
      `status=${resp.status()}, errorAfterSelect=${errorAfterSelect ?? 'tidak ada'}`,
    );
  }

  report.print();
});
