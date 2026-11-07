/**
 * ================================================================================
 * TC-ADMIN-JOBTITLE-01: Verify Add Job Title Valid
 * Modul    : Admin - Job Titles
 * Kategori : Positive (+)
 * Env      : OrangeHRM Demo: opensource-demo.orangehrmlive.com
 * File     : TC-ADMIN-JOBTITLE-01-Verify-Add-Job-Title-Valid.spec.ts
 * Path     : tests/admin/job-titles/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi menambah Job Title baru (Job Title, Job Description,
 *   Note) berhasil tersimpan via POST /api/v2/admin/job-titles dan muncul
 *   di list.
 *
 * RUN COMMAND:
 *   npx playwright test tests/admin/job-titles/TC-ADMIN-JOBTITLE-01-Verify-Add-Job-Title-Valid.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { uniqueName } from '../../../src/data/testData';

test('TC-ADMIN-JOBTITLE-01: adding a job title with valid data succeeds', async ({
  page,
  adminJobTitlesPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-ADMIN-JOBTITLE-01', 'Add Job Title Valid', env.baseURL, page);
  const jobTitle = uniqueName('QaJobTitle');

  report.step('Isi Job Title, Job Description, Note, klik Save');
  await adminJobTitlesPage.gotoAdd();
  await adminJobTitlesPage.jobTitleInput.fill(jobTitle);
  await adminJobTitlesPage.jobDescriptionTextarea.fill('QA automation job title');
  await adminJobTitlesPage.noteTextarea.fill('Created by automated test');

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v2/admin/job-titles') && r.request().method() === 'POST'),
    adminJobTitlesPage.save(),
  ]);

  report.step('Verify response POST job-titles, dan job title muncul di list');
  report.check('[API] status === 200', resp.status() === 200, `status=${resp.status()}`);
  await adminJobTitlesPage.goto();
  await page.waitForTimeout(1200);
  report.check(
    `Job title "${jobTitle}" muncul di list`,
    await adminJobTitlesPage.rowByName(jobTitle).first().isVisible({ timeout: 5_000 }).catch(() => false),
  );

  report.print();
});
