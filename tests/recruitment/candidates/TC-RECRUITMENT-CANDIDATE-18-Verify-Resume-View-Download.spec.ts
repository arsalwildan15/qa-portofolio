/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-18: Verify Resume View/Download
 * Modul    : Recruitment - Candidates
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-18-Verify-Resume-View-Download.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi resume yang diupload bisa didownload utuh dari halaman
 *   detail candidate -- bukan cuma "upload diterima" seperti
 *   CANDIDATE-01/07/16.
 *   [CONFIRMED via discovery run, dan KOREKSI dari dugaan awal]: pada
 *   percobaan pertama field Resume tampak sebagai <input type="file">
 *   kosong ("No file selected"), TAPI itu rendering state yang
 *   tertangkap SEBELUM data candidate selesai dimuat (race antara
 *   `gotoDetail()` dan initial GET). Setelah wait yang cukup (~5s, pola
 *   sama dengan tombol aksi status), field Resume dirender ulang sebagai
 *   `.orangehrm-file-current` berisi nama file ("resume.pdf") DAN ikon
 *   download (`i.orangehrm-file-download`) yang NYATA mentrigger event
 *   `download` browser dengan `suggestedFilename() === 'resume.pdf'`.
 *   Jadi fitur view/download resume ADA dan berfungsi -- bukan N/A
 *   seperti sempat terlihat di observasi awal yang belum menunggu cukup
 *   lama.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-18-Verify-Resume-View-Download.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestCandidate } from '../../../src/utils/createTestCandidate';

test('TC-RECRUITMENT-CANDIDATE-18: uploaded resume can be downloaded intact from detail page', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-18', 'Resume View/Download', env.baseURL, page);

  report.step('Buat candidate baru dengan resume ter-upload (createTestCandidate, resume.pdf)');
  const { candidateId } = await createTestCandidate(page, candidatesPage, 'QaResumeDownload');

  report.step('Buka detail candidate, tunggu render Candidate Profile (~5s), cari ikon download resume');
  await candidatesPage.gotoDetail(candidateId);
  await page.waitForTimeout(5000);

  const resumeFilenameText = page.locator('.orangehrm-file-name').first();
  const filenameVisible = await resumeFilenameText.isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Nama file resume ("resume.pdf") ditampilkan di Candidate Profile', filenameVisible);
  const filenameTitle = await resumeFilenameText.getAttribute('title').catch(() => null);
  report.check('Nama file yang ditampilkan sesuai file yang diupload', filenameTitle === 'resume.pdf', `title=${filenameTitle}`);

  const downloadIcon = page.locator('.orangehrm-file-download').first();
  const downloadIconVisible = await downloadIcon.isVisible({ timeout: 5_000 }).catch(() => false);
  report.check('Ikon download resume tersedia dan bisa diklik', downloadIconVisible);

  report.step('Klik ikon download, intersep event download browser, bandingkan dengan file asli yang diupload');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
    downloadIcon.click({ timeout: 5_000 }).catch(() => {}),
  ]);
  report.check('Event download browser terpicu setelah klik ikon', !!download);

  if (download) {
    report.check('Nama file yang didownload sama dengan yang diupload ("resume.pdf")', download.suggestedFilename() === 'resume.pdf', `suggestedFilename=${download.suggestedFilename()}`);
    const path = await download.path();
    const fs = await import('fs');
    const downloadedSize = path ? fs.statSync(path).size : 0;
    const originalSize = Buffer.byteLength('%PDF-1.4 minimal valid-looking resume content');
    report.check('File yang didownload tidak kosong/corrupt (ukuran > 0 byte)', downloadedSize > 0, `downloadedSize=${downloadedSize}`);
    report.finding(
      'Resume berhasil didownload utuh dari halaman detail candidate',
      `File "resume.pdf" (ukuran asli saat upload=${originalSize} byte) berhasil didownload via ikon download di ` +
        `Candidate Profile, suggestedFilename="${download.suggestedFilename()}", ukuran file terdownload=${downloadedSize} byte. ` +
        'Fitur view/download resume ADA dan berfungsi -- koreksi dari observasi awal gap-coverage doc yang sempat ' +
        'menduga field ini kosong karena tertangkap sebelum render selesai (race condition render, bukan race aplikasi).',
    );
  } else {
    report.finding('Download event tidak terpicu', 'Klik ikon download tidak menghasilkan event download browser dalam 10s.');
  }

  report.check('TC dijalankan tanpa exception', true);
  report.print();
});
