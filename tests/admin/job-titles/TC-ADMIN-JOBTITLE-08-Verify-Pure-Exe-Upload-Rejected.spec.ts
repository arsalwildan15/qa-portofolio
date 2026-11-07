/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-08: Verify Pure Exe Upload Rejected
 * Modul    : Admin - Job Titles
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-08-Verify-Pure-Exe-Upload-Rejected.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline untuk TC-ADMIN-JOBTITLE-07: membuktikan file .exe dengan
 *   ekstensi ASLI (tidak di-rename) memang ditolak sebagai Job
 *   Specification, supaya temuan TC-07 (kalau bug reproduce) murni soal
 *   validasi ekstensi vs konten, bukan tidak ada validasi sama sekali.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-08-Verify-Pure-Exe-Upload-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-ADMIN-JOBTITLE-08: an .exe file with its real extension is rejected as a Job Specification file', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-08', 'Pure Exe Upload Rejected', env.baseURL, page);
  const jobTitle = uniqueName('QaPureExe');

  report.step('Isi Job Title, upload file .exe dengan ekstensi asli sbg Job Specification');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await adminJobTitlesPage.jobSpecificationFileInput.setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/x-msdownload',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  const errorAfterSelect = await adminJobTitlesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);

  report.step('Verify: coba Save, cek apakah file .exe asli ditolak (bukan POST 200)');
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/job-titles') && r.request().method() === 'POST', { timeout: 8_000 })
    .catch(() => null);
  await adminJobTitlesPage.save();
  const resp = await respPromise;

  report.check(
    'File .exe ekstensi asli ditolak (tidak ada POST 200 sukses)',
    !resp || resp.status() !== 200,
    `status=${resp?.status() ?? 'tidak ada response'}, errorAfterSelect=${errorAfterSelect ?? 'tidak ada'}`,
  );

  report.print();
});
