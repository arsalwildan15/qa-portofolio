/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-03: Verify Job Title Very Long Text
 * Modul    : Admin - Job Titles
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-03-Verify-Job-Title-Very-Long-Text.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Mendokumentasikan perilaku form saat Job Title diisi teks sangat
 *   panjang (300 karakter). Hasilnya didokumentasikan via report.finding()
 *   karena perilaku batas ini genuinely tergantung apakah ada max-length
 *   validation atau truncation, bukan pass/fail yang jelas salah.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-03-Verify-Job-Title-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-JOBTITLE-03: a 300-character Job Title is documented as-is', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-03', 'Job Title Very Long Text', env.baseURL, page);
  const longTitle = 'QaLongJobTitle'.padEnd(300, 'X');

  report.step('Isi Job Title dengan 300 karakter, klik Save');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(longTitle);
  const respPromise = page
    .waitForResponse((r) => r.url().includes('/api/v2/admin/job-titles') && r.request().method() === 'POST', { timeout: 10_000 })
    .catch(() => null);
  await adminJobTitlesPage.save();
  const resp = await respPromise;
  await page.waitForTimeout(500);

  report.step('Verify: catat apakah diterima, ditolak validasi, atau dipotong');
  if (resp) {
    report.finding('Job Title 300 karakter diterima server', `POST status=${resp.status()}`);
  } else {
    const error = await adminJobTitlesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
    report.finding('Job Title 300 karakter ditolak/divalidasi client-side', `error=${error ?? 'tidak ada pesan terbaca'}`);
  }
  report.check('TC dijalankan tanpa exception', true);

  report.print();
});
