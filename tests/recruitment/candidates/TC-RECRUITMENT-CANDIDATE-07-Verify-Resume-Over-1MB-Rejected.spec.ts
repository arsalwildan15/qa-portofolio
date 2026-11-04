/**
 * ================================================================================
 * TC-RECRUITMENT-CANDIDATE-07: Verify Resume Over 1MB Rejected
 * Modul    : Recruitment - Candidates
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-RECRUITMENT-CANDIDATE-07-Verify-Resume-Over-1MB-Rejected.spec.ts
 * Path     : tests/recruitment/candidates/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi file Resume yang melebihi batas ukuran 1MB ditolak
 *   dengan pesan validasi, bukan diterima.
 *
 * RUN COMMAND:
 *   npx playwright test tests/recruitment/candidates/TC-RECRUITMENT-CANDIDATE-07-Verify-Resume-Over-1MB-Rejected.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueEmployeeName, uniqueEmail } from '../../../src/data/testData';

const OVERSIZED_BUFFER = Buffer.alloc(1_100_000, 'a');

test('TC-RECRUITMENT-CANDIDATE-07: a resume file over 1MB is rejected', async ({
  page,
  candidatesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-RECRUITMENT-CANDIDATE-07', 'Resume Over 1MB Rejected', env.baseURL, page);
  const { firstName, lastName } = uniqueEmployeeName('QaBigResume');

  report.step('Isi field wajib, upload resume >1MB');
  await candidatesPage.gotoAddForm();
  await candidatesPage.fillName(firstName, lastName);
  await candidatesPage.selectFirstVacancy();
  await candidatesPage.emailInput.fill(uniqueEmail('qabigresume'));
  await candidatesPage.fileInput.setInputFiles({
    name: 'resume-oversized.pdf',
    mimeType: 'application/pdf',
    buffer: OVERSIZED_BUFFER,
  });
  await page.waitForTimeout(500);

  report.step('Verify: pesan error ukuran file muncul, dan klik Save tidak memicu POST sukses');
  const sizeError = await page
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
    'File oversized ditolak (ada error validasi atau POST tidak terkirim)',
    sizeError !== null || resp === null,
    `sizeError=${sizeError ?? 'tidak ada'}, postFired=${resp !== null}`,
  );

  report.print();
});
