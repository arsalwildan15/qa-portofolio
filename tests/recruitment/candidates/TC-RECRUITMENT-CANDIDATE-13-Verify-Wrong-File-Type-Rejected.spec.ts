/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-13: Verify Wrong File Type Rejected
 * Modul    : Recruitment - Candidates
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-13-Verify-Wrong-File-Type-Rejected.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi file dengan tipe yang tidak didukung Resume (.png,
 *   bukan salah satu dari .docx/.doc/.odt/.pdf/.rtf/.txt) ditolak.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-13-Verify-Wrong-File-Type-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

// Minimal valid PNG header bytes.
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('TC-RECRUITMENT-CANDIDATE-13: a .png file is rejected as a resume', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-13', 'Wrong File Type Rejected', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaWrongType');

  report.step('Isi field wajib, upload file .png sebagai Resume');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qawrongtype'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume.png',
    mimeType: 'image/png',
    buffer: PNG_BUFFER,
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
    'File .png ditolak (ada error validasi atau POST tidak sukses)',
    typeError !== null || resp === null || resp.status() !== 200,
    `typeError=${typeError ?? 'tidak ada'}, postStatus=${resp?.status() ?? 'tidak terkirim'}`,
  );

  report.print();
});
