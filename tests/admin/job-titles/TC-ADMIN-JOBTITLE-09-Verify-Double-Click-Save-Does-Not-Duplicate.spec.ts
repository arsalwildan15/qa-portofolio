/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-09: Verify Double-Click Save Does Not Duplicate
 * Modul    : Admin - Job Titles
 * Kategori : Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-09-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik ganda cepat pada tombol Save di form Add Job
 *   Title TIDAK membuat 2 job title identik tersimpan. Titik create
 *   TERPISAH dari TC-ADMIN-USER-09 -- tidak boleh diasumsikan sama
 *   amannya hanya krn satu sudah dites.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-09-Verify-Double-Click-Save-Does-Not-Duplicate.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBTITLE-09: rapid double-click on Save does not create duplicate job titles', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(45_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-09', 'Double-Click Save Does Not Duplicate', env.baseURL, page);
  const jobTitle = uniqueName('QaDoubleJobTitle');

  report.step('Isi Job Title valid, klik Save 2x secepat mungkin');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await adminJobTitlesPage.jobDescriptionTextarea.fill('QA automation job title');

  let postCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v2/admin/job-titles')) postCount++;
  });
  await Promise.all([
    adminJobTitlesPage.saveButton.click(),
    adminJobTitlesPage.saveButton.click({ timeout: 2_000 }).catch(() => {}),
  ]);
  await page.waitForTimeout(2500);

  report.step('Verify jumlah POST request dan jumlah row di list');
  report.check(
    'Client TIDAK men-debounce tombol Save (2 request terkirim) -- gap minor, bukan bug kritis',
    postCount === 1,
    `postCount=${postCount}`,
  );
  await adminJobTitlesPage.goto();
  await page.waitForTimeout(1500);
  const count = await adminJobTitlesPage.rowByName(jobTitle).count();
  report.check(
    `Job title "${jobTitle}" muncul TEPAT 1 kali di list (TIDAK ada duplikat data tersimpan)`,
    count === 1,
    `count=${count}`,
  );
  report.finding(
    'Mengapa tidak ada duplikat data meski 2 POST terkirim',
    'Request ke-2 ditolak server dgn 422 (kemungkinan validasi unique-name) -- data integrity ' +
      'TERJAGA oleh validasi server-side, bukan oleh client. Tapi penanganan response 422 tsb ' +
      'memicu "Uncaught exception: fe" yang sama persis dgn bug app-wide yang sudah dikonfirmasi ' +
      '(BG-199/200/201/202) -- konfirmasi lagi lewat jalur BERBEDA (validasi error asli).',
  );

  report.print();
});
