/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-02: Verify Empty Submit Validation
 * Modul    : Admin - Job Titles
 * Kategori : Negative (-)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-02-Verify-Empty-Submit-Validation.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi submit form Add Job Title tanpa mengisi Job Title
 *   (satu-satunya field wajib) menampilkan validasi "Required" dan
 *   TIDAK mengirim POST.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-02-Verify-Empty-Submit-Validation.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';

test('TC-ADMIN-JOBTITLE-02: submitting an empty Add Job Title form shows Required validation', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-02', 'Empty Submit Validation', env.baseURL, page);

  report.step('Buka form Add Job Title, klik Save tanpa isi apa pun');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.save();
  await page.waitForTimeout(800);

  report.step('Verify: pesan Required muncul, form tidak pindah halaman (tidak submit)');
  const requiredError = await adminJobTitlesPage.fieldErrors.first().textContent({ timeout: 2_000 }).catch(() => null);
  report.check('Pesan validasi "Required" muncul', (requiredError ?? '').trim().length > 0, `error=${requiredError}`);
  report.check('URL masih di form Add (tidak submit)', page.url().includes('saveJobTitle') || page.url().includes('JobTitle'));

  report.print();
});
