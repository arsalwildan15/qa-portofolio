/**
 * ================================================================================
 * TC-PIM-QUALIFICATION-04 — Verify XSS In Company
 * Modul    : PIM - Qualifications
 * Kategori : Security (S)
 * Env      : OrangeHRM Demo — opensource-demo.orangehrmlive.com
 * File     : TC-PIM-QUALIFICATION-04-Verify-XSS-In-Company.spec.ts
 * Path     : tests/pim/qualifications/
 * ================================================================================
 *
 * TUJUAN:
 *   Memverifikasi payload XSS di Company tidak pernah tereksekusi.
 *
 * RUN COMMAND:
 *   npx playwright test tests/pim/qualifications/TC-PIM-QUALIFICATION-04-Verify-XSS-In-Company.spec.ts --project=chromium --headed
 * ================================================================================
 */

import { authenticatedTest as test } from '../../../src/fixtures/pages.fixture';
import { env } from '../../../src/config/env';
import { TestReport } from '../../../src/utils/testReport';
import { createTestEmployee } from '../../../src/utils/createTestEmployee';

test('TC-PIM-QUALIFICATION-04: XSS payload in Company is not executed', async ({
  page,
  addEmployeePage,
  qualificationsPage,
}, testInfo) => {
  testInfo.setTimeout(60_000);
  const report = new TestReport('TC-PIM-QUALIFICATION-04', 'XSS In Company', env.baseURL, page);

  let dialogFired = false;
  page.on('dialog', async (dialog) => {
    dialogFired = true;
    await dialog.dismiss();
  });

  report.step('Buat employee baru, navigate ke Qualifications');
  const { empNumber } = await createTestEmployee(page, addEmployeePage, 'QaQualXss');
  await qualificationsPage.goto(empNumber);

  report.step(`Isi Company = "<script>alert('xss')</script>", Job Title, From/To, klik Save`);
  await qualificationsPage.openAddWorkExperience();
  await qualificationsPage.companyInput.waitFor({ state: 'visible' });
  await qualificationsPage.companyInput.fill("<script>alert('xss')</script>");
  await qualificationsPage.jobTitleInput.fill('QA Engineer');
  await qualificationsPage.fromDateInput.fill('2018-01-01');
  await qualificationsPage.toDateInput.fill('2020-01-01');
  await qualificationsPage.save();
  await page.reload();
  await page.waitForTimeout(1500);

  report.step('Verify tidak ada dialog alert() yang terpicu');
  report.check('Tidak ada dialog alert() yang terpicu', dialogFired === false);

  report.print();
});
