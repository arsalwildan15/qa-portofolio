/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-05: Verify Cancel Discards Form
 * Modul    : Admin - Job Titles
 * Kategori : Unexpected / Edge Case (!)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-05-Verify-Cancel-Discards-Form.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi klik Cancel pada form Add Job Title membatalkan isian
 *   dan kembali ke list tanpa menyimpan apa pun.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-05-Verify-Cancel-Discards-Form.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBTITLE-05: clicking Cancel discards the Add Job Title form', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(30_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-05', 'Cancel Discards Form', env.baseURL, page);
  const jobTitle = uniqueName('QaCancelled');

  report.step('Isi Job Title, klik Cancel');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await adminJobTitlesPage.cancelButton.click();
  await page.waitForTimeout(1200);

  report.step('Verify: kembali ke list, job title TIDAK tersimpan');
  report.check('Kembali ke list Job Titles', page.url().includes('JobTitleList') || page.url().includes('jobTitle'));
  report.check(
    `Job title "${jobTitle}" TIDAK muncul di list`,
    !(await adminJobTitlesPage.rowByName(jobTitle).first().isVisible({ timeout: 3_000 }).catch(() => false)),
  );

  report.print();
});
