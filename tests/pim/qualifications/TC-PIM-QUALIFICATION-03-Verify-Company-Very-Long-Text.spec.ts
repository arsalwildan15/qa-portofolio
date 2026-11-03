/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-03 — Verify Company Very Long Text
 * Modul    : PIM - Qualifications
 * Kategori : Boundary (B)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-03-Verify-Company-Very-Long-Text.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi Company dengan 300 karakter tidak membuat server
 *   crash.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-03-Verify-Company-Very-Long-Text.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-03: company with 300 characters does not crash the server', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-03', 'Company Very Long Text', env.baseURL, page);

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualLong');
  await qualificationsPage.goto(empNumber);

  report.step('Isi Company = 300x "a", Job Title, From/To, klik Save');
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.companyInput.fill('a'.repeat(300));
  await qualificationsPage.jobTitleInput.fill('QA Engineer');
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
