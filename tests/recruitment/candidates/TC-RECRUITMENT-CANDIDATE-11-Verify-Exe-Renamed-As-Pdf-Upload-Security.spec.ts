/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-11: Verify Exe Renamed As Pdf Upload Security
 * Modul    : Recruitment - Candidates
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-11-Verify-Exe-Renamed-As-Pdf-Upload-Security.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan apakah bug yang sama dengan TC-PIM-ADD-28 (upload
 *   foto cuma validasi ekstensi, bukan konten/magic bytes file) berulang
 *   di upload Resume Candidate. File executable (header PE "MZ") yang
 *   di-rename jadi .pdf diharapkan LOLOS tanpa validasi konten.
 *   Bandingkan dengan TC-RECRUITMENT-CANDIDATE-12 yang membuktikan file
 *   .exe dengan ekstensi ASLI memang ditolak, jadi ini murni soal
 *   validasi ekstensi yang bisa di-bypass dengan rename.
 *
 *   Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) kalau memang
 *   lolos, supaya temuannya tercatat di docs/Bug-List.xlsx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-11-Verify-Exe-Renamed-As-Pdf-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

// Minimal PE header bytes ("MZ..."): identifies as a real Windows executable.
const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-RECRUITMENT-CANDIDATE-11: an executable renamed to .pdf is accepted as a resume', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-11', 'Exe Renamed As Pdf Upload Security', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaExeAsPdf');

  report.step('Isi field wajib, upload file executable yang di-rename jadi .pdf');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qaexeaspdf'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume-spoofed.pdf',
    mimeType: 'application/pdf',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await page
    .locator('.oxd-input-group .oxd-text--span')
    .first()
    .textContent({ timeout: 2_000 })
    .catch(() => null);

  report.step('Verify: coba Save, cek apakah file exe-as-pdf diterima (POST 200)');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST'),
    candidatesPage.save(),
  ]);

  report.check(
    '[BUG jika true] File executable yang di-rename .pdf SEHARUSNYA ditolak, tapi diterima (POST 200)',
    resp.status() !== 200,
    `status=${resp.status()}, errorAfterSelect=${errorAfterSelect ?? 'tidak ada'}`,
  );

  report.print();
});
