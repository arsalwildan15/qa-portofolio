/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-12: Verify Pure Exe Upload Rejected
 * Modul    : Recruitment - Candidates
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-12-Verify-Pure-Exe-Upload-Rejected.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Baseline pembanding untuk TC-RECRUITMENT-CANDIDATE-11: file .exe
 *   dengan ekstensi ASLI (tidak di-rename) harus ditolak oleh validasi
 *   ekstensi client-side pada input Resume. Membuktikan validasi
 *   ekstensi memang ada dan berfungsi, hanya bisa di-bypass dengan rename.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-12-Verify-Pure-Exe-Upload-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const EXE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);

test('TC-RECRUITMENT-CANDIDATE-12: a .exe file with its real extension is rejected as a resume', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-12', 'Pure Exe Upload Rejected', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaPureExe');

  report.step('Isi field wajib, upload file .exe dengan ekstensi asli');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qapureexe'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.exe',
    mimeType: 'application/x-msdownload',
    buffer: EXE_BUFFER,
  });
  await page.waitForTimeout(500);

  report.step('Verify: pesan error tipe file muncul, dan POST tidak terkirim sukses');
  const typeError = await page
    .locator('.oxd-input-group .oxd-text--span')
    .first()
    .textContent({ timeout: 2_000 })
    .catch(() => null);

  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/recruitment/candidates') && r.request().method() === 'POST', { timeout: 5_000 })
    .catch(() => null);
  await candidatesPage.save();
  const resp = await respPromise;

  report.check(
    'File .exe asli ditolak (ada error validasi atau POST tidak sukses)',
    typeError !== null || resp === null || resp.status() !== 200,
    `typeError=${typeError ?? 'tidak ada'}, postStatus=${resp?.status() ?? 'tidak terkirim'}`,
  );

  report.print();
});
