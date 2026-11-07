/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-07: Verify Exe Renamed As Jpg Upload Security
 * Modul    : Admin - Job Titles
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-07-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan apakah bug yang sama dengan TC-PIM-ADD-28 dan
 *   TC-RECRUITMENT-CANDIDATE-11 (upload cuma validasi ekstensi, bukan
 *   konten/magic bytes) berulang di upload "Job Specification" pada form
 *   Add Job Title. File executable (header PE "MZ") yang di-rename jadi
 *   .jpg diuji apakah lolos tanpa validasi konten. Bandingkan dengan
 *   TC-ADMIN-JOBTITLE-08 yang membuktikan file .exe ekstensi ASLI.
 *
 *   Test ini SENGAJA dibiarkan FAILED (bukan test.fail()) kalau memang
 *   lolos, supaya temuannya tercatat di docs/Bug-List.xlsx.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-07-Verify-Exe-Renamed-As-Jpg-Upload-Security.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-ADMIN-JOBTITLE-07: an executable renamed to .jpg is accepted as a Job Specification file', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-07', 'Exe Renamed As Jpg Upload Security', env.baseURL, page);
  const jobTitle = uniqueName('QaExeAsJpg');

  report.step('Isi Job Title, upload file executable yang di-rename jadi .jpg sbg Job Specification');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await adminJobTitlesPage.jobSpecificationFileInput.setInputFiles({
    name: 'jobspec-spoofed.jpg',
    mimeType: 'image/jpeg',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await adminJobTitlesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: coba Save, cek apakah file exe-as-jpg diterima (POST 200)');
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/job-titles') && r.request().method() === 'POST'),
    adminJobTitlesPage.save(),
  ]);

  report.check(
    '[BUG jika true] File executable yang di-rename .jpg SEHARUSNYA ditolak, tapi diterima (POST 200)',
    resp.status() !== 200,
    `status=${resp.status()}, errorAfterSelect=${errorAfterSelect ?? 'tidak ada'}`,
  );

  report.print();
});
