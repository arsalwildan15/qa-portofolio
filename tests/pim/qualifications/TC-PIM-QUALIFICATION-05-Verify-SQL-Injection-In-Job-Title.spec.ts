/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-05 — Verify SQL Injection In Job Title
 * Modul    : PIM - Qualifications
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-05-Verify-SQL-Injection-In-Job-Title.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload SQL injection di Job Title (Work Experience)
 *   tidak membuat server crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-05-Verify-SQL-Injection-In-Job-Title.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-05: SQL injection in Job Title does not crash the server', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-05', 'SQL Injection In Job Title', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualSqli');
  await qualificationsPage.goto(empNumber);

  report.step(`Isi Company, Job Title = "' OR '1'='1", From/To, klik Save`);
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.companyInput.fill('Acme Corp');
  await qualificationsPage.jobTitleInput.fill("' OR '1'='1");
  await qualificationsPage.fromDateInput.fill('2018-01-01');
  await qualificationsPage.toDateInput.fill('2020-01-01');
  let serverErrorStatus: number | null = null;
  page.on('response', (r) => {
    if (r.status() >= 500) serverErrorStatus = r.status();
  });
  await qualificationsPage.save();
  await page.waitForTimeout(1500);

  report.step('Verify server tidak crash');
  report.check('Tidak ada response 5xx', serverErrorStatus === null, `status=${serverErrorStatus}`);

  report.print();
});
